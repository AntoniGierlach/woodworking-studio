import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createObjectStorage } from "./object-storage";

const localKeyPattern = /^local-contact\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function localPath(key: string) {
  const match = localKeyPattern.exec(key);
  if (!match) throw new Error("Invalid private attachment key.");
  return join(process.cwd(), "storage", "private-contact", match[1]);
}

export function newContactAttachmentKey(): string {
  const backend = process.env.CONTACT_ATTACHMENT_STORAGE?.trim() ||
    (process.env.PUBLIC_MEDIA_STORAGE?.trim() === "local" ? "local" : "r2");
  if (backend !== "local" && backend !== "r2") {
    throw new Error("CONTACT_ATTACHMENT_STORAGE must be local or r2.");
  }
  return `${backend === "local" ? "local-contact" : "contact-uploads"}/${randomUUID()}`;
}

export async function writeContactAttachment(key: string, bytes: Buffer, mimeType: string) {
  if (key.startsWith("local-contact/")) {
    const path = localPath(key);
    await mkdir(join(process.cwd(), "storage", "private-contact"), { recursive: true });
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

export async function readContactAttachment(key: string): Promise<Uint8Array> {
  if (key.startsWith("local-contact/")) return readFile(localPath(key));
  const storage = createObjectStorage();
  try {
    const object = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: key }));
    if (!object.Body) throw new Error("Attachment body is missing.");
    return await object.Body.transformToByteArray();
  } finally {
    storage.client.destroy();
  }
}

export async function deleteContactAttachment(key: string) {
  if (key.startsWith("local-contact/")) {
    try {
      await unlink(localPath(key));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    return;
  }
  const storage = createObjectStorage();
  try {
    await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }));
  } finally {
    storage.client.destroy();
  }
}
