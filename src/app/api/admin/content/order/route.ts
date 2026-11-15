import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { query } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";

const schema = z.object({
  type: z.enum(["carpentry_services", "services", "projects", "woods"]),
  id: z.string().uuid(),
  targetId: z.string().uuid(),
}).strict();

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane kolejności." }, { status: 422 });
  }

  const { type, id, targetId } = parsed.data;
  const table = {
    carpentry_services: "app_carpentry_services",
    projects: "app_projects",
    services: "app_services",
    woods: "app_wood_types",
  }[type];
  try {
    const timestampUpdate =
      type === "carpentry_services" ? ", date_updated = CURRENT_TIMESTAMP" : "";
    const result = await query(
      `WITH ranked AS MATERIALIZED (
         SELECT id, row_number() OVER (ORDER BY sort ASC, date_created DESC, id ASC) AS position
         FROM ${table}
       ), positions AS (
         SELECT (SELECT position FROM ranked WHERE id = $1) AS source,
                (SELECT position FROM ranked WHERE id = $2) AS target
       )
       UPDATE ${table}
       SET sort = (SELECT CASE
             WHEN ranked.position = positions.source THEN positions.target
             WHEN positions.source < positions.target AND ranked.position > positions.source
                  AND ranked.position <= positions.target THEN ranked.position - 1
             WHEN positions.source > positions.target AND ranked.position >= positions.target
                  AND ranked.position < positions.source THEN ranked.position + 1
             ELSE ranked.position
           END - 1 FROM ranked, positions WHERE ranked.id = ${table}.id)${timestampUpdate}
       WHERE EXISTS (SELECT 1 FROM positions WHERE source IS NOT NULL AND target IS NOT NULL)
       RETURNING id`,
      [id, targetId],
    );
    if (!result.rowCount) {
      return NextResponse.json({ error: "Wpis nie istnieje. Odśwież listę." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({
      event: "admin_content_reorder_failed",
      type,
      reason: error instanceof Error ? error.message : "unknown",
    }));
    return NextResponse.json({ error: "Nie udało się zapisać kolejności." }, { status: 503 });
  }
}
