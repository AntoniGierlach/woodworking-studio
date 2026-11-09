import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-session";
import { query } from "@/lib/db";
import { ObjectStorageConfigurationError } from "@/lib/object-storage";
import { deletePublicMedia, newPublicMediaKey, writePublicMedia } from "@/lib/public-media-storage";
import { isSameOrigin } from "@/lib/request-security";

function detectImage(bytes: Buffer): { mimeType: string; extension: string } | null {
  if (
    bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > 11 * 1024 * 1024) {
    return NextResponse.json({ error: "Plik jest zbyt duży." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy plik." }, { status: 400 });
  }
  const upload = formData.get("file");
  if (!(upload instanceof File) || upload.size < 1 || upload.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Zdjęcie musi mieć maksymalnie 10 MB." },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await upload.arrayBuffer());
  const detected = detectImage(bytes);
  if (!detected) {
    return NextResponse.json(
      { error: "Dozwolone są zdjęcia JPEG, PNG lub WebP." },
      { status: 422 },
    );
  }

  let storageKey: string | undefined;
  let uploaded = false;
  try {
    storageKey = newPublicMediaKey(detected.extension);
    await writePublicMedia(storageKey, bytes, detected.mimeType);
    uploaded = true;
    const alt = String(formData.get("alt") ?? "").trim().slice(0, 255);
    const saved = await query<{ id: string }>(
      `INSERT INTO app_media
         (storage_key, original_filename, mime_type, size_bytes, visibility, alt)
       VALUES ($1, $2, $3, $4, 'public', $5)
       RETURNING id`,
      [
        storageKey,
        upload.name.replace(/[\\/\r\n"]/g, "_").slice(0, 255) || "image",
        detected.mimeType,
        bytes.length,
        alt || null,
      ],
    );
    return NextResponse.json({ data: { id: saved.rows[0].id } }, { status: 201 });
  } catch (error) {
    if (error instanceof ObjectStorageConfigurationError) {
      console.error(JSON.stringify({ event: "admin_media_storage_not_configured" }));
      return NextResponse.json(
        { error: "Przechowywanie zdjęć R2 nie jest skonfigurowane. Uzupełnij ustawienia R2 w pliku .env i uruchom ponownie aplikację." },
        { status: 503 },
      );
    }
    if (uploaded && storageKey) {
      try {
        await deletePublicMedia(storageKey);
      } catch {
        console.error(JSON.stringify({ event: "admin_media_upload_rollback_failed" }));
      }
    }
    console.error(
      JSON.stringify({
        event: "admin_media_upload_failed",
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return NextResponse.json({ error: "Nie udało się zapisać zdjęcia." }, { status: 503 });
  }
}
