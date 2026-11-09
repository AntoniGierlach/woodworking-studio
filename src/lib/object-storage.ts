import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

export class ObjectStorageConfigurationError extends Error {}

export function createObjectStorage(): { client: S3Client; bucket: string } {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new ObjectStorageConfigurationError("Object storage is not configured.");
  }
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new ObjectStorageConfigurationError("Object storage endpoint is invalid.");
  }
  if (endpointUrl.protocol !== "https:" || endpointUrl.username || endpointUrl.password) {
    throw new ObjectStorageConfigurationError("Object storage endpoint is invalid.");
  }

  return {
    client: new S3Client({
      endpoint: endpointUrl.toString(),
      region: process.env.R2_REGION?.trim() || "auto",
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    }),
    bucket,
  };
}
