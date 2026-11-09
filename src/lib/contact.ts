import "server-only";

import Busboy from "busboy";
import { z } from "zod";

export const MAX_FILES_DEFAULT = 5;
export const MAX_FILE_SIZE_DEFAULT = 10 * 1024 * 1024;
export const MAX_TOTAL_SIZE_DEFAULT = 30 * 1024 * 1024;
const MAX_RATE_LIMIT_ENTRIES = 5_000;
const MAX_MULTIPART_FIELD_SIZE = 40 * 10_000;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(1).max(10_000),
  website: z.string().max(2_000).optional(),
});

export type ContactFields = z.infer<typeof contactSchema>;

export interface ContactLimits {
  maxFiles: number;
  maxFileSizeBytes: number;
  maxTotalSizeBytes: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
}

export interface ContactFile {
  originalName: string;
  declaredMimeType: string;
  buffer: Buffer;
}

export class ContactRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "ContactRequestError";
  }
}

const rateLimitWindows = new Map<
  string,
  { count: number; resetAt: number }
>();

function integerSetting(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new ContactRequestError(
      503,
      "contact_service_not_configured",
      "The contact service is not configured.",
    );
  }
  return parsed;
}

export function getContactLimits(): ContactLimits {
  const maxFiles = integerSetting("CONTACT_MAX_FILES", 5, 1, 5);
  const maxFileSizeMb = integerSetting(
    "CONTACT_MAX_FILE_SIZE_MB",
    10,
    1,
    10,
  );
  const maxTotalSizeMb = integerSetting(
    "CONTACT_MAX_TOTAL_SIZE_MB",
    30,
    1,
    30,
  );
  const maxTotalSizeBytes = maxTotalSizeMb * 1024 * 1024;
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
  if (maxTotalSizeBytes < maxFileSizeBytes) {
    throw new ContactRequestError(
      503,
      "contact_service_not_configured",
      "The contact service is not configured.",
    );
  }

  return {
    maxFiles,
    maxFileSizeBytes,
    maxTotalSizeBytes,
    rateLimitMax: integerSetting("CONTACT_RATE_LIMIT_MAX", 5, 1, 1_000),
    rateLimitWindowMs: integerSetting(
      "CONTACT_RATE_LIMIT_WINDOW_MS",
      60_000,
      1_000,
      86_400_000,
    ),
  };
}

export function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  for (const [entryKey, entry] of rateLimitWindows) {
    if (entry.resetAt <= now) {
      rateLimitWindows.delete(entryKey);
    }
  }

  const current = rateLimitWindows.get(key);
  if (current && current.resetAt > now) {
    current.count += 1;
    return current.count > maxRequests;
  }

  if (rateLimitWindows.size >= MAX_RATE_LIMIT_ENTRIES) {
    return true;
  }

  rateLimitWindows.set(key, { count: 1, resetAt: now + windowMs });
  return false;
}

const allowedFields = new Set([
  "name",
  "email",
  "phone",
  "subject",
  "message",
  "website",
]);

export async function parseContactMultipart(
  request: Request,
  limits: ContactLimits,
): Promise<{ fields: ContactFields; files: ContactFile[] }> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ContactRequestError(
      400,
      "invalid_content_type",
      "Submit the contact form as multipart form data.",
    );
  }

  const contentLength = request.headers.get("content-length");
  const maxRequestBytes =
    limits.maxTotalSizeBytes + MULTIPART_OVERHEAD_BYTES;
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new ContactRequestError(400, "invalid_request", "Invalid request.");
    }
    if (parsedLength > maxRequestBytes) {
      throw new ContactRequestError(
        413,
        "request_too_large",
        "The submitted files exceed the allowed total size.",
      );
    }
  }

  let parser: ReturnType<typeof Busboy>;
  try {
    parser = Busboy({
      headers: { "content-type": contentType },
      limits: {
        fileSize: limits.maxFileSizeBytes,
        files: limits.maxFiles,
        fields: allowedFields.size,
        fieldSize: MAX_MULTIPART_FIELD_SIZE,
        parts: allowedFields.size + limits.maxFiles,
      },
    });
  } catch {
    throw new ContactRequestError(
      400,
      "invalid_multipart",
      "The submitted form data is invalid.",
    );
  }

  const fields: Record<string, string> = {};
  const files: ContactFile[] = [];
  let totalFileBytes = 0;
  let requestBytes = 0;
  let settled = false;
  const reader = request.body?.getReader();
  if (!reader) {
    throw new ContactRequestError(400, "invalid_request", "Invalid request.");
  }

  const parsePromise = new Promise<void>((resolve, reject) => {
    const fail = (error: ContactRequestError) => {
      if (settled) return;
      settled = true;
      parser.destroy();
      reject(error);
    };

    parser.on("field", (field, value, info) => {
      if (!allowedFields.has(field) || Object.hasOwn(fields, field)) {
        fail(
          new ContactRequestError(
            400,
            "invalid_form_field",
            "The submitted form contains an invalid field.",
          ),
        );
        return;
      }
      if (info.valueTruncated) {
        fail(
          new ContactRequestError(
            413,
            "field_too_large",
            "A submitted form field is too long.",
          ),
        );
        return;
      }
      fields[field] = value;
    });

    parser.on("file", (field, stream, info) => {
      if (field !== "files") {
        stream.resume();
        fail(
          new ContactRequestError(
            400,
            "invalid_file_field",
            "Files must be submitted using the files field.",
          ),
        );
        return;
      }

      if (!info.filename) {
        stream.resume();
        return;
      }

      const chunks: Buffer[] = [];
      let fileSize = 0;
      stream.on("data", (chunk: Buffer) => {
        fileSize += chunk.length;
        totalFileBytes += chunk.length;
        if (fileSize > limits.maxFileSizeBytes) {
          fail(
            new ContactRequestError(
              413,
              "file_too_large",
              "A file exceeds the allowed size.",
            ),
          );
          return;
        }
        if (totalFileBytes > limits.maxTotalSizeBytes) {
          fail(
            new ContactRequestError(
              413,
              "files_too_large",
              "The submitted files exceed the allowed total size.",
            ),
          );
          return;
        }
        chunks.push(chunk);
      });
      stream.on("limit", () => {
        fail(
          new ContactRequestError(
            413,
            "file_too_large",
            "A file exceeds the allowed size.",
          ),
        );
      });
      stream.on("end", () => {
        if (!settled) {
          files.push({
            originalName: info.filename ?? "",
            declaredMimeType: info.mimeType?.toLowerCase() ?? "",
            buffer: Buffer.concat(chunks),
          });
        }
      });
    });

    parser.on("filesLimit", () => {
      fail(
        new ContactRequestError(
          413,
          "too_many_files",
          "Too many files were submitted.",
        ),
      );
    });
    parser.on("fieldsLimit", () => {
      fail(
        new ContactRequestError(
          400,
          "too_many_fields",
          "Too many form fields were submitted.",
        ),
      );
    });
    parser.on("partsLimit", () => {
      fail(
        new ContactRequestError(
          400,
          "too_many_parts",
          "Too many form fields or files were submitted.",
        ),
      );
    });
    parser.on("error", () => {
      fail(
        new ContactRequestError(
          400,
          "invalid_multipart",
          "The submitted form data is invalid.",
        ),
      );
    });
    parser.on("finish", () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    });
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      requestBytes += value.byteLength;
      if (requestBytes > maxRequestBytes) {
        throw new ContactRequestError(
          413,
          "request_too_large",
          "The submitted files exceed the allowed total size.",
        );
      }

      if (!parser.write(Buffer.from(value))) {
        await Promise.race([
          new Promise<void>((resolve) => parser.once("drain", resolve)),
          parsePromise,
        ]);
      }
    }
    parser.end();
    await parsePromise;
  } catch (error) {
    parser.destroy();
    await reader.cancel().catch(() => undefined);
    if (error instanceof ContactRequestError) throw error;
    throw new ContactRequestError(
      400,
      "invalid_multipart",
      "The submitted form data is invalid.",
    );
  } finally {
    reader.releaseLock();
  }

  const parsedFields = contactSchema.safeParse(fields);
  if (!parsedFields.success) {
    throw new ContactRequestError(
      422,
      "validation_error",
      "Check the contact form fields and try again.",
      parsedFields.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return { fields: parsedFields.data, files };
}

function detectFileType(buffer: Buffer): string | undefined {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return undefined;
}

const extensionMimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export function validateContactFile(
  file: ContactFile,
  limits: ContactLimits,
): { mimeType: string; safeOriginalName: string } {
  const filenameParts = file.originalName.split(/[\\/]/);
  const rawName = filenameParts[filenameParts.length - 1] ?? "";
  const extension = rawName.split(".").pop()?.toLowerCase() ?? "";
  const expectedMimeType = extensionMimeTypes[extension];
  const detectedMimeType = detectFileType(file.buffer);

  if (
    file.buffer.length === 0 ||
    file.buffer.length > limits.maxFileSizeBytes ||
    !expectedMimeType ||
    expectedMimeType !== file.declaredMimeType ||
    expectedMimeType !== detectedMimeType
  ) {
    throw new ContactRequestError(
      422,
      "unsupported_file",
      "One or more files have an unsupported type or invalid contents.",
      [{ field: "files", message: "Use a valid JPG, PNG, WebP, or PDF file." }],
    );
  }

  const safeOriginalName =
    rawName
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 255) || "attachment";

  return { mimeType: detectedMimeType, safeOriginalName };
}
