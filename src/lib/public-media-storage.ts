import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createObjectStorage } from "./object-storage";

const localKeyPattern = /^local-media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpg|webp))$/i;

function localPath(key: string): string {
  const match = localKeyPattern.exec(key);
  if (!match) throw new Error("Invalid local media key.");
  return join(process.cwd(), "storage", "public-media", match[1]);
}

export function newPublicMediaKey(extension: string): string {
  if (!["png", "jpg", "webp"].includes(extension)) throw new Error("Invalid image extension.");
  const backend = process.env.PUBLIC_MEDIA_STORAGE?.trim() || "r2";
  if (backend !== "local" && backend !== "r2") {
    throw new Error("PUBLIC_MEDIA_STORAGE must be local or r2.");
  }
  return `${backend === "local" ? "local-media" : "public-media"}/${randomUUID()}.${extension}`;
}

export async function writePublicMedia(key: string, bytes: Buffer, mimeType: string): Promise<void> {
  if (key.startsWith("local-media/")) {
    const path = localPath(key);
    await mkdir(join(process.cwd(), "storage", "public-media"), { recursive: true });
    await writeFile(path, bytes, { flag: "wx" });
    return;
  }
  const storage = createObjectStorage();
  try {
    await storage.client.send(new PutObjectCommand({
      Bucket: storage.bucket, Key: key, Body: bytes, ContentType: mimeType,
    }));
  } finally {
    storage.client.destroy();
  }
}

export async function readPublicMedia(key: string): Promise<Uint8Array> {
  if (key.startsWith("local-media/")) return readFile(localPath(key));
  const storage = createObjectStorage();
  try {
    const object = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: key }));
    if (!object.Body) throw new Error("Image body is missing.");
    return await object.Body.transformToByteArray();
  } finally {
    storage.client.destroy();
  }
}

export async function deletePublicMedia(key: string): Promise<void> {
  if (key.startsWith("local-media/")) {
    await unlink(localPath(key));
    return;
  }
  const storage = createObjectStorage();
  try {
    await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }));
  } finally {
    storage.client.destroy();
  }
}
