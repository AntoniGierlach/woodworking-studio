import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

declare global {
  interface CloudflareEnv {
    FILES: {
      put(key: string, value: Uint8Array, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
      get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
      delete(key: string): Promise<void>;
    };
  }
}

function bucket() {
  const { FILES } = getCloudflareContext().env;
  if (!FILES) throw new Error("Cloudflare R2 binding FILES is not configured.");
  return FILES;
}

export async function writeCloudflareFile(key: string, bytes: Buffer, mimeType: string): Promise<void> {
  await bucket().put(key, bytes, { httpMetadata: { contentType: mimeType } });
}

export async function readCloudflareFile(key: string): Promise<Uint8Array> {
  const object = await bucket().get(key);
  if (!object) throw new Error("Cloudflare R2 object not found.");
  return new Uint8Array(await object.arrayBuffer());
}

export async function deleteCloudflareFile(key: string): Promise<void> {
  await bucket().delete(key);
}
