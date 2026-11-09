import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { query } from "@/lib/db";
import { readContactAttachment } from "@/lib/contact-attachment-storage";

type AttachmentRecord = {
  storage_key: string;
  original_filename: string;
  mime_type: string;
};

function safeFilename(filename: string): string {
  return filename
    .replace(/[\r\n"\\]/g, "_")
    .slice(0, 255)
    .replace(/[^\x20-\x7e]/g, "_") || "attachment";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const result = await query<AttachmentRecord>(
      `SELECT storage_key, original_filename, mime_type
       FROM app_message_attachments WHERE id = $1`,
      [id],
    );
    const attachment = result.rows[0];
    if (!attachment) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(attachment.mime_type)) {
      return NextResponse.json({ error: "Attachment unavailable." }, { status: 415 });
    }
    const bytes = await readContactAttachment(attachment.storage_key);
    const inline = new URL(request.url).searchParams.get("view") === "1";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": attachment.mime_type,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeFilename(attachment.original_filename)}"; filename*=UTF-8''${encodeURIComponent(attachment.original_filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "admin_attachment_read_failed",
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return NextResponse.json({ error: "Attachment unavailable." }, { status: 503 });
  }
}
