import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { readPublicMedia } from "@/lib/public-media-storage";

type MediaRecord = {
  storage_key: string;
  mime_type: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const result = await query<MediaRecord>(
      "SELECT storage_key, mime_type FROM app_media WHERE id = $1 AND visibility = 'public'",
      [id],
    );
    const media = result.rows[0];
    if (!media || !["image/jpeg", "image/png", "image/webp"].includes(media.mime_type)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const bytes = await readPublicMedia(media.storage_key);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": media.mime_type,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "public_media_read_failed",
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return NextResponse.json({ error: "Image unavailable." }, { status: 503 });
  }
}
