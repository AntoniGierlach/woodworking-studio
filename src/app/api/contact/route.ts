import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { NextResponse, type NextRequest } from "next/server";
import {
  ContactRequestError,
  getContactLimits,
  isRateLimited,
  parseContactMultipart,
  validateContactFile,
} from "@/lib/contact";
import { query, withTransaction } from "@/lib/db";
import { deleteContactAttachment, newContactAttachmentKey, writeContactAttachment } from "@/lib/contact-attachment-storage";
import { isSameOrigin } from "@/lib/request-security";

type ValidatedContactFile = {
  file: { buffer: Buffer };
  mimeType: string;
  safeOriginalName: string;
};

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>,
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

function requiredEnv(...names: string[]): string[] {
  return names.filter((name) => !process.env[name]?.trim());
}

function trustedClientKey(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "origin_not_allowed", "This request is not allowed.");
  }

  let limits;
  try {
    limits = getContactLimits();
  } catch (error) {
    if (error instanceof ContactRequestError) {
      return jsonError(error.status, error.code, error.message);
    }
    return jsonError(
      503,
      "contact_service_not_configured",
      "The contact service is not configured.",
    );
  }

  if (
    isRateLimited(
      trustedClientKey(request),
      limits.rateLimitMax,
      limits.rateLimitWindowMs,
    )
  ) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limit_exceeded",
          message: "Too many requests. Try again later.",
        },
      },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  if (
    requiredEnv(
      "DATABASE_URL",
    ).length > 0
  ) {
    return jsonError(
      503,
      "contact_service_not_configured",
      "The contact service is not configured.",
    );
  }

  let submission;
  try {
    submission = await parseContactMultipart(request, limits);
  } catch (error) {
    if (error instanceof ContactRequestError) {
      return jsonError(error.status, error.code, error.message, error.details);
    }
    return jsonError(400, "invalid_request", "The submitted form is invalid.");
  }

  if (submission.fields.website?.trim()) {
    return NextResponse.json({ data: { accepted: true } }, { status: 202 });
  }

  const validatedFiles: ValidatedContactFile[] = [];
  try {
    let totalSize = 0;
    for (const file of submission.files) {
      const validated = validateContactFile(file, limits);
      totalSize += file.buffer.length;
      if (totalSize > limits.maxTotalSizeBytes) {
        throw new ContactRequestError(
          413,
          "files_too_large",
          "The submitted files exceed the allowed total size.",
        );
      }
      validatedFiles.push({ file, ...validated });
    }
  } catch (error) {
    if (error instanceof ContactRequestError) {
      return jsonError(error.status, error.code, error.message, error.details);
    }
    return jsonError(
      422,
      "unsupported_file",
      "One or more files have an unsupported type or invalid contents.",
    );
  }

  const messageId = randomUUID();
  const storageKeys: string[] = [];
  try {
    for (const { file, mimeType } of validatedFiles) {
      const storageKey = newContactAttachmentKey();
      await writeContactAttachment(storageKey, file.buffer, mimeType);
      storageKeys.push(storageKey);
    }

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO app_messages (id, name, email, phone, subject, message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          messageId,
          submission.fields.name,
          submission.fields.email,
          submission.fields.phone || null,
          submission.fields.subject || null,
          submission.fields.message,
        ],
      );

      for (const [index, attachment] of validatedFiles.entries()) {
        await client.query(
          `INSERT INTO app_message_attachments
             (message_id, storage_key, original_filename, mime_type, size_bytes)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            messageId,
            storageKeys[index],
            attachment.safeOriginalName,
            attachment.mimeType,
            attachment.file.buffer.length,
          ],
        );
      }
    });
  } catch (error) {
    let cleanupFailed = false;
    for (const key of storageKeys) {
      try {
        await deleteContactAttachment(key);
      } catch {
        cleanupFailed = true;
      }
    }
    if (cleanupFailed) {
      console.error(JSON.stringify({ event: "contact_upload_rollback_failed" }));
    }
    console.error(
      JSON.stringify({
        event: "contact_submission_save_failed",
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return jsonError(
      503,
      "contact_submission_failed",
      "Nie udało się zapisać wiadomości. Spróbuj ponownie później.",
    );
  }

  let notificationFailed = false;
  let notificationError: string | null = null;
  try {
    const result = await query<{ email: string | null }>(
      "SELECT email FROM app_site_settings WHERE id = 1",
    );
    const recipient = result.rows[0]?.email?.trim();
    if (!recipient || requiredEnv("RESEND_API_KEY", "EMAIL_FROM").length > 0) {
      throw new Error("Email recipient or notification service is not configured.");
    }
    const includeEmailAttachments = validatedFiles.reduce(
      (total, { file }) => total + file.buffer.length,
      0,
    ) <= 20 * 1024 * 1024;
    const resend = new Resend(process.env.RESEND_API_KEY!.trim());
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!.trim(),
      to: recipient,
      replyTo: submission.fields.email,
      subject: `Zapytanie ze strony: ${submission.fields.subject || "nowa wiadomość"}`,
      text: [
        `Imię i nazwisko: ${submission.fields.name}`,
        `E-mail: ${submission.fields.email}`,
        `Telefon: ${submission.fields.phone || "Nie podano"}`,
        `Temat: ${submission.fields.subject || "Nie podano"}`,
        "",
        "Wiadomość:",
        submission.fields.message,
        "",
        `Załączniki: ${validatedFiles.length}${includeEmailAttachments ? "" : " (dostępne w panelu administratora; zbyt duże, by dołączyć je do wiadomości e-mail)"}`,
        "Zgłoszenie jest zapisane w panelu administratora.",
      ].join("\n"),
      attachments: (includeEmailAttachments ? validatedFiles : []).map(({ file, safeOriginalName, mimeType }) => ({
        filename: safeOriginalName,
        content: file.buffer,
        contentType: mimeType,
      })),
    });
    if (error) throw new Error(`Email provider rejected notification: ${error.message}`);
  } catch (error) {
    notificationFailed = true;
    notificationError = error instanceof Error ? error.message : "Email delivery failed.";
  }

  try {
    await query(
      `UPDATE app_messages
       SET email_notification_status = $2,
           email_notification_error = $3
       WHERE id = $1`,
      [
        messageId,
        notificationFailed ? "failed" : "sent",
        notificationError,
      ],
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "contact_notification_status_update_failed",
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
  }

  if (notificationFailed) {
    console.error(
      JSON.stringify({
        event: "contact_notification_failed",
        code: "provider_delivery_failed",
      }),
    );
  }

  return NextResponse.json(
    {
      data: { accepted: true },
      message: notificationFailed
        ? "Wiadomość została zapisana. Powiadomienie e-mail nie zostało dostarczone."
        : "Wiadomość została wysłana. Dziękujemy za kontakt.",
    },
    { status: 201 },
  );
}
