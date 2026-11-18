import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { batch, query } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";
import { deleteContactAttachment } from "@/lib/contact-attachment-storage";
import { deletePublicMedia } from "@/lib/public-media-storage";
import { randomUUID } from "node:crypto";

const recordStatus = z.enum(["draft", "published"]);
const contentSlug = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const contentSchemas = {
  services: z.object({
    title: z.string().trim().min(1).max(255),
    slug: contentSlug,
    short_description: z.string().max(500).nullable().optional(),
    content: z.string().max(100_000).nullable().optional(),
    price: z.preprocess(
      (value) => typeof value === "string" && value.trim() === "" ? null : value,
      z.string().trim().max(120).nullable(),
    ).optional(),
    image_id: z.string().uuid().nullable().optional(),
    sort: z.coerce.number().int().min(-100_000).max(100_000).optional(),
    status: recordStatus.optional(),
  }).strict(),
  projects: z.object({
    title: z.string().trim().min(1).max(255),
    slug: contentSlug,
    category: z.string().max(255).nullable().optional(),
    short_description: z.string().max(500).nullable().optional(),
    description: z.string().max(100_000).nullable().optional(),
    cover_image_id: z.string().uuid().nullable().optional(),
    gallery_media_ids: z
      .array(z.string().uuid())
      .max(24)
      .refine((ids) => new Set(ids).size === ids.length)
      .optional(),
    sort: z.coerce.number().int().min(-100_000).max(100_000).optional(),
    status: recordStatus.optional(),
  }).strict(),
  woods: z.object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(10_000),
    image_id: z.string().uuid().nullable().optional(),
    sort: z.coerce.number().int().min(-100_000).max(100_000).optional(),
    status: recordStatus.optional(),
  }).strict(),
  messages: z.object({
    status: z.enum(["new", "in_progress", "done"]).optional(),
    is_read: z.boolean().optional(),
  }).strict(),
  settings: z.object({
    company_name: z.string().max(255).nullable().optional(),
    phone: z.string().max(100).nullable().optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    address: z.string().max(10_000).nullable().optional(),
    tax_id: z.string().trim().max(20).nullable().optional(),
    opening_hours: z.string().max(1_000).nullable().optional(),
    service_area: z.string().max(255).nullable().optional(),
    facebook_url: z.string().url().max(2048).nullable().optional(),
    instagram_url: z.string().url().max(2048).nullable().optional(),
    footer_text: z.string().max(10_000).nullable().optional(),
    seo_title: z.string().max(255).nullable().optional(),
    seo_description: z.string().max(10_000).nullable().optional(),
  }).strict(),
} as const;

type ContentType = keyof typeof contentSchemas;

const tables: Record<Exclude<ContentType, "settings">, string> = {
  services: "app_services",
  projects: "app_projects",
  woods: "app_wood_types",
  messages: "app_messages",
};

const mediaReferences = {
  services: "SELECT image_id FROM app_services WHERE id = $1",
  woods: "SELECT image_id FROM app_wood_types WHERE id = $1",
  projects: `SELECT cover_image_id FROM app_projects WHERE id = $1
             UNION SELECT media_id FROM app_project_images WHERE project_id = $1`,
} as const;

type MediaContentType = keyof typeof mediaReferences;

function isMediaContentType(type: ContentType): type is MediaContentType {
  return type === "services" || type === "woods" || type === "projects";
}

function queueMedia(type: MediaContentType, id: string) {
  return {
    sql: `INSERT OR IGNORE INTO app_media_deletion_queue (storage_key)
          SELECT storage_key FROM app_media WHERE id IN (${mediaReferences[type]})`,
    values: [id],
  };
}

const retainReferencedMedia = {
  sql: `DELETE FROM app_media_deletion_queue WHERE storage_key IN (
          SELECT m.storage_key FROM app_media m
          WHERE EXISTS (SELECT 1 FROM app_services s WHERE s.image_id = m.id)
             OR EXISTS (SELECT 1 FROM app_wood_types w WHERE w.image_id = m.id)
             OR EXISTS (SELECT 1 FROM app_projects p WHERE p.cover_image_id = m.id)
             OR EXISTS (SELECT 1 FROM app_project_images i WHERE i.media_id = m.id)
        )`,
};
const removeQueuedMedia = {
  sql: "DELETE FROM app_media WHERE storage_key IN (SELECT storage_key FROM app_media_deletion_queue)",
};

async function cleanupQueuedMedia(): Promise<string | undefined> {
  try {
    const queued = await query<{ storage_key: string }>(
      "SELECT storage_key FROM app_media_deletion_queue ORDER BY queued_at, storage_key LIMIT 25",
    );
    let failed = false;
    for (const { storage_key } of queued.rows) {
      try {
        await deletePublicMedia(storage_key);
        await query("DELETE FROM app_media_deletion_queue WHERE storage_key = $1", [storage_key]);
      } catch (error) {
        failed = true;
        console.error(JSON.stringify({
          event: "admin_media_cleanup_failed",
          reason: error instanceof Error ? error.message : "unknown",
        }));
      }
    }
    if (failed) {
      return "Nie udało się usunąć części zdjęć z magazynu. Operacja zostanie ponowiona przy kolejnej edycji lub usunięciu realizacji, usługi lub gatunku drewna.";
    }
    const remaining = await query("SELECT 1 FROM app_media_deletion_queue LIMIT 1");
    if (remaining.rows.length) {
      return "Część zdjęć czeka na usunięcie. Operacja zostanie ponowiona przy kolejnej edycji lub usunięciu realizacji, usługi lub gatunku drewna.";
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: "admin_media_cleanup_failed",
      reason: error instanceof Error ? error.message : "unknown",
    }));
    return "Nie udało się usunąć części zdjęć z magazynu. Operacja zostanie ponowiona przy kolejnej edycji lub usunięciu realizacji, usługi lub gatunku drewna.";
  }
}

function isContentType(value: string): value is ContentType {
  return Object.hasOwn(contentSchemas, value);
}

function sqlValues(entries: Array<[string, unknown]>): Array<string | number | boolean | null> {
  return entries.map(([, value]) => {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    throw new Error("Unsupported database value.");
  });
}

async function getCollection(type: ContentType) {
  if (type === "settings") {
    const result = await query("SELECT * FROM app_site_settings WHERE id = 1");
    return result.rows[0] ?? null;
  }
  if (type === "messages") {
    const result = await query(
      `SELECT m.id, m.name, m.email, m.phone, m.subject, m.message, m.status,
              m.email_notification_status, m.date_created, m.is_read,
              COALESCE(
                json_group_array(json_object(
                  'id', a.id,
                  'filename', a.original_filename,
                  'mime_type', a.mime_type,
                  'size_bytes', a.size_bytes
                )) FILTER (WHERE a.id IS NOT NULL),
                '[]'
              ) AS attachments
       FROM app_messages m
       LEFT JOIN app_message_attachments a ON a.message_id = m.id
       GROUP BY m.id
       ORDER BY m.date_created DESC
       LIMIT 100`,
    );
    return result.rows.map((row) => ({
      ...row,
      is_read: Boolean(row.is_read),
      attachments: JSON.parse(String(row.attachments)),
    }));
  }
  if (type === "projects") {
    const result = await query(
      `SELECT p.*,
              COALESCE((
                SELECT json_group_array(media_id)
                FROM (SELECT media_id FROM app_project_images
                      WHERE project_id = p.id ORDER BY sort, id)
              ), '[]') AS gallery_media_ids
       FROM app_projects p
       ORDER BY p.sort ASC, p.date_created DESC, p.id ASC
       LIMIT 100`,
    );
    return result.rows.map((row) => ({
      ...row,
      gallery_media_ids: JSON.parse(String(row.gallery_media_ids)),
    }));
  }
  const orderBy =
    type === "services" || type === "woods"
      ? "sort ASC, date_created DESC, id ASC"
      : "date_created DESC";
  const result = await query(
    `SELECT * FROM ${tables[type]} ORDER BY ${orderBy} LIMIT 100`,
  );
  return result.rows;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const type = request.nextUrl.searchParams.get("type") ?? "";
  if (!isContentType(type)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 400 });
  }
  try {
    return NextResponse.json({ data: await getCollection(type) });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "admin_content_read_failed",
        type,
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return NextResponse.json({ error: "Could not load content." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await readBody(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { type, data } = body;
  if (!isContentType(type) || type === "messages") {
    return NextResponse.json({ error: "This content type cannot be created." }, { status: 400 });
  }
  const parsed = contentSchemas[type].safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the submitted fields.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    if (type === "settings") {
      const entries = Object.entries(parsed.data);
      if (entries.length === 0) {
        return NextResponse.json({ error: "No settings were submitted." }, { status: 422 });
      }
      const columns = entries.map(([column]) => column);
      const values = sqlValues(entries);
      const insertColumns = ["id", ...columns];
      const insertValues = ["1", ...values.map((_, index) => `$${index + 1}`)];
      const updates = columns.map((column, index) => `${column} = $${index + 1}`);
      const result = await query(
        `INSERT INTO app_site_settings (${insertColumns.join(", ")})
         VALUES (${insertValues.join(", ")})
         ON CONFLICT (id) DO UPDATE SET ${updates.join(", ")}, date_updated = CURRENT_TIMESTAMP
         RETURNING *`,
        values,
      );
      return NextResponse.json({ data: result.rows[0] });
    }

    const entries = Object.entries(parsed.data);
    const galleryIds =
      type === "projects"
        ? contentSchemas.projects.parse(data).gallery_media_ids ?? []
        : [];
    const recordEntries =
      type === "projects"
        ? entries.filter(([column]) => column !== "gallery_media_ids")
        : entries;
    const columns = ["id", ...recordEntries.map(([column]) => column)];
    const id = randomUUID();
    const values = [id, ...sqlValues(recordEntries)];
    const insertSql = `INSERT INTO ${tables[type]} (${columns.join(", ")})
       VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})
       RETURNING id`;
    const result =
      type === "projects"
        ? (await batch<{ id: string }>([
            { sql: insertSql, values },
            ...galleryIds.map((mediaId, sort) => ({
              sql: `INSERT INTO app_project_images (id, project_id, media_id, sort)
                    VALUES ($1, $2, $3, $4)`,
              values: [randomUUID(), id, mediaId, sort],
            })),
          ]))[0]
        : await query(insertSql, values);
    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return handleWriteError(error, type);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const body = await readBody(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { type, data } = body;
  const id = typeof body.id === "string" ? body.id : "";
  if (
    !isContentType(type) ||
    (type === "settings" ? id !== "1" : !/^[0-9a-f-]{36}$/i.test(id))
  ) {
    return NextResponse.json({ error: "Invalid content identifier." }, { status: 400 });
  }

  const schema = contentSchemas[type].partial();
  const parsed = schema.safeParse(data);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return NextResponse.json({ error: "Check the submitted fields." }, { status: 422 });
  }
  const entries = Object.entries(parsed.data);
  const galleryIds =
    type === "projects"
      ? contentSchemas.projects.partial().parse(data).gallery_media_ids
      : undefined;
  const recordEntries =
    type === "projects"
      ? entries.filter(([column]) => column !== "gallery_media_ids")
      : entries;
  const values = sqlValues(recordEntries);

  try {
    let result;
    if (type === "settings") {
      const columns = entries.map(([column]) => column);
      const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
      result = await query(
        `INSERT INTO app_site_settings (id, ${columns.join(", ")})
         VALUES (1, ${values.map((_, index) => `$${index + 1}`).join(", ")})
         ON CONFLICT (id) DO UPDATE SET ${assignments.join(", ")}, date_updated = CURRENT_TIMESTAMP
         RETURNING *`,
        values,
      );
    } else if (type === "messages") {
      const assignments = recordEntries.map(([column], index) => `${column} = $${index + 1}`);
      result = await query(
        `UPDATE app_messages SET ${assignments.join(", ")} WHERE id = $${values.length + 1} RETURNING id`,
        [...values, id],
      );
    } else {
      const assignments = recordEntries.map(
        ([column], index) => `${column} = $${index + 1}`,
      );
      assignments.push("date_updated = CURRENT_TIMESTAMP");
      const updateSql = `UPDATE ${tables[type]} SET ${assignments.join(", ")}
         WHERE id = $${values.length + 1} RETURNING id`;
      const changesMedia = isMediaContentType(type) && (
        (type === "projects" && (galleryIds !== undefined || "cover_image_id" in parsed.data)) ||
        (type !== "projects" && "image_id" in parsed.data)
      );
      if (changesMedia && isMediaContentType(type)) {
        const results = await batch([
          queueMedia(type, id),
          { sql: updateSql, values: [...values, id] },
          ...(type === "projects" && galleryIds !== undefined ? [
            { sql: "DELETE FROM app_project_images WHERE project_id = $1", values: [id] },
            ...galleryIds.map((mediaId, sort) => ({
              sql: `INSERT INTO app_project_images (id, project_id, media_id, sort)
                    SELECT $1, $2, $3, $4 WHERE EXISTS (SELECT 1 FROM app_projects WHERE id = $2)`,
              values: [randomUUID(), id, mediaId, sort],
            })),
          ] : []),
          retainReferencedMedia,
          removeQueuedMedia,
        ]);
        result = results[1];
      } else {
        result = await query(updateSql, [...values, id]);
      }
    }
    if (!result.rowCount) {
      return NextResponse.json({ error: "Content not found." }, { status: 404 });
    }
    const warning = isMediaContentType(type) ? await cleanupQueuedMedia() : undefined;
    return NextResponse.json({ data: result.rows[0], ...(warning && { warning }) });
  } catch (error) {
    return handleWriteError(error, type);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const type = request.nextUrl.searchParams.get("type") ?? "";
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!isContentType(type) || type === "settings" ||
      !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid delete request." }, { status: 400 });
  }
  if (type === "messages") {
    try {
      const message = await query("SELECT id FROM app_messages WHERE id = $1", [id]);
      if (!message.rowCount) return NextResponse.json({ error: "Nie znaleziono wiadomości." }, { status: 404 });
      const attachments = await query<{ storage_key: string }>(
        "SELECT storage_key FROM app_message_attachments WHERE message_id = $1", [id],
      );
      for (const attachment of attachments.rows) {
        await deleteContactAttachment(attachment.storage_key);
      }
      const deleted = await query("DELETE FROM app_messages WHERE id = $1", [id]);
      if (!deleted.rowCount) return NextResponse.json({ error: "Nie znaleziono wiadomości." }, { status: 404 });
      return NextResponse.json({ deleted: true });
    } catch (error) {
      console.error(JSON.stringify({
        event: "admin_message_delete_failed",
        reason: error instanceof Error ? error.message : "unknown",
      }));
      return NextResponse.json({
        error: "Nie udało się usunąć wiadomości. Część załączników mogła już zostać usunięta. Spróbuj ponownie.",
      }, { status: 503 });
    }
  }
  try {
    const result = isMediaContentType(type)
      ? (await batch([
          queueMedia(type, id),
          { sql: `DELETE FROM ${tables[type]} WHERE id = $1`, values: [id] },
          retainReferencedMedia,
          removeQueuedMedia,
        ]))[1]
      : await query(`DELETE FROM ${tables[type]} WHERE id = $1`, [id]);
    if (!result.rowCount) {
      return NextResponse.json({ error: "Content not found." }, { status: 404 });
    }
    const warning = isMediaContentType(type) ? await cleanupQueuedMedia() : undefined;
    return NextResponse.json({ deleted: true, ...(warning && { warning }) });
  } catch (error) {
    return handleWriteError(error, type);
  }
}

async function readBody(
  request: NextRequest,
): Promise<{ type: string; data: unknown; id?: unknown } | null> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
    const record = body as Record<string, unknown>;
    if (typeof record.type !== "string" || !("data" in record)) return null;
    return { type: record.type, data: record.data, id: record.id };
  } catch {
    return null;
  }
}

function handleWriteError(error: unknown, type: ContentType) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const reason = error instanceof Error
    ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`
    : "";
  if (code === "23505" || reason.includes("UNIQUE constraint failed")) {
    return NextResponse.json(
      { error: "Wpis o takim adresie URL już istnieje." },
      { status: 409 },
    );
  }
  if (code === "23503" || reason.includes("FOREIGN KEY constraint failed")) {
    return NextResponse.json(
      { error: "Wybrane zdjęcie nie istnieje." },
      { status: 422 },
    );
  }
  console.error(
    JSON.stringify({
      event: "admin_content_write_failed",
      type,
      reason: error instanceof Error ? error.message : "unknown",
    }),
  );
  return NextResponse.json({ error: "Nie udało się zapisać treści." }, { status: 503 });
}
