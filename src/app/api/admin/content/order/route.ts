import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { withTransaction } from "@/lib/db";
import { moveItem } from "@/lib/reorder";
import { isSameOrigin } from "@/lib/request-security";

const schema = z.object({
  type: z.enum(["services", "projects", "woods"]),
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
  const table = { projects: "app_projects", services: "app_services", woods: "app_wood_types" }[type];
  try {
    const updated = await withTransaction(async (client) => {
      await client.query(`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`);
      const result = await client.query<{ id: string }>(
        `SELECT id FROM ${table} ORDER BY sort ASC, date_created DESC, id ASC`,
      );
      const ids = result.rows.map((row) => row.id);
      const from = ids.indexOf(id);
      const to = ids.indexOf(targetId);
      if (from === -1 || to === -1) return false;
      if (from !== to) {
        await client.query(
          `UPDATE ${table} AS entry SET sort = ordered.position - 1
           FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
           WHERE entry.id = ordered.id`,
          [moveItem(ids, from, to)],
        );
      }
      return true;
    });
    if (!updated) {
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
