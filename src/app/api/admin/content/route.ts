import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { query, withTransaction } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";
import { deleteContactAttachment } from "@/lib/contact-attachment-storage";

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
    tone: z.string().trim().min(1).max(255),
    grain: z.string().trim().min(1).max(255),
    character: z.string().trim().min(1).max(255),
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

function isContentType(value: string): value is ContentType {
  return Object.hasOwn(contentSchemas, value);
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
                json_agg(json_build_object(
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
    return result.rows;
  }
  if (type === "projects") {
    const result = await query(
      `SELECT p.*,
              COALESCE(
                array_agg(pi.media_id::text ORDER BY pi.sort)
                  FILTER (WHERE pi.media_id IS NOT NULL),
                ARRAY[]::text[]
              ) AS gallery_media_ids
       FROM app_projects p
       LEFT JOIN app_project_images pi ON pi.project_id = p.id
       GROUP BY p.id
       ORDER BY p.sort ASC, p.date_created DESC, p.id ASC
       LIMIT 100`,
    );
    return result.rows;
  }
  const orderBy =
    type === "services" || type === "woods" ? "sort ASC, date_created DESC, id ASC" : "date_created DESC";
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
      const values = entries.map(([, value]) => value);
      const insertColumns = ["id", ...columns];
      const insertValues = ["1", ...values.map((_, index) => `$${index + 1}`)];
      const updates = columns.map((column, index) => `${column} = $${index + 1}`);
      const result = await query(
        `INSERT INTO app_site_settings (${insertColumns.join(", ")})
         VALUES (${insertValues.join(", ")})
         ON CONFLICT (id) DO UPDATE SET ${updates.join(", ")}, date_updated = now()
         RETURNING *`,
        values,
      );
      return NextResponse.json({ data: result.rows[0] });
    }

    const entries: Array<[string, unknown]> = Object.entries(parsed.data);
    const galleryIds =
      type === "projects"
        ? contentSchemas.projects.parse(data).gallery_media_ids ?? []
        : [];
    const recordEntries =
      type === "projects"
        ? entries.filter(([column]) => column !== "gallery_media_ids")
        : entries;
    const columns = recordEntries.map(([column]) => column);
    const values = recordEntries.map(([, value]) => value);
    const insertSql = `INSERT INTO ${tables[type]} (${columns.join(", ")})
       VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})
       RETURNING id`;
    const result =
      type === "projects"
        ? await withTransaction(async (client) => {
            const inserted = await client.query<{ id: string }>(insertSql, values);
            for (const [sort, mediaId] of galleryIds.entries()) {
              await client.query(
                `INSERT INTO app_project_images (project_id, media_id, sort)
                 VALUES ($1, $2, $3)`,
                [inserted.rows[0].id, mediaId, sort],
              );
            }
            return inserted;
          })
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
  const values = recordEntries.map(([, value]) => value);

  try {
    let result;
    if (type === "settings") {
      const columns = entries.map(([column]) => column);
      const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
      result = await query(
        `INSERT INTO app_site_settings (id, ${columns.join(", ")})
         VALUES (1, ${values.map((_, index) => `$${index + 1}`).join(", ")})
         ON CONFLICT (id) DO UPDATE SET ${assignments.join(", ")}, date_updated = now()
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
      assignments.push("date_updated = now()");
      const updateSql = `UPDATE ${tables[type]} SET ${assignments.join(", ")}
         WHERE id = $${values.length + 1} RETURNING id`;
      result =
        type === "projects" && galleryIds !== undefined
          ? await withTransaction(async (client) => {
              const updated = await client.query(
                updateSql,
                [...values, id],
              );
              if (updated.rowCount) {
                await client.query(
                  "DELETE FROM app_project_images WHERE project_id = $1",
                  [id],
                );
                for (const [sort, mediaId] of galleryIds.entries()) {
                  await client.query(
                    `INSERT INTO app_project_images (project_id, media_id, sort)
                     VALUES ($1, $2, $3)`,
                    [id, mediaId, sort],
                  );
                }
              }
              return updated;
            })
          : await query(updateSql, [...values, id]);
    }
    if (!result.rowCount) {
      return NextResponse.json({ error: "Content not found." }, { status: 404 });
    }
    return NextResponse.json({ data: result.rows[0] });
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
      const deleted = await withTransaction(async (client) => {
        const message = await client.query("SELECT id FROM app_messages WHERE id = $1 FOR UPDATE", [id]);
        if (!message.rowCount) return false;
        const attachments = await client.query<{ storage_key: string }>(
          "SELECT storage_key FROM app_message_attachments WHERE message_id = $1",
          [id],
        );
        for (const attachment of attachments.rows) {
          await deleteContactAttachment(attachment.storage_key);
        }
        await client.query("DELETE FROM app_messages WHERE id = $1", [id]);
        return true;
      });
      if (!deleted) return NextResponse.json({ error: "Nie znaleziono wiadomości." }, { status: 404 });
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
    const result = await query(`DELETE FROM ${tables[type]} WHERE id = $1`, [id]);
    if (!result.rowCount) {
      return NextResponse.json({ error: "Content not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
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
  if (code === "23505") {
    return NextResponse.json(
      { error: "Wpis o takim adresie URL już istnieje." },
      { status: 409 },
    );
  }
  if (code === "23503") {
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
