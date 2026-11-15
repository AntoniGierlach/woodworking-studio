import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { NextRequest } from "next/server";
import { query } from "./db";

const GLOBAL_LIMIT = 60;
const GLOBAL_WINDOW_MS = 60_000;

function hashKey(key: string, secret: string): string {
  return createHmac("sha256", secret)
    .update("contact-rate-limit\0")
    .update(key)
    .digest("hex");
}

async function consumeWindow(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<number | null> {
  const result = await query<{ attempts: number; retry_after: number }>(
    `INSERT INTO app_contact_rate_limits (key_hash, attempts, reset_at)
     VALUES ($1, 1, now() + $2 * interval '1 millisecond')
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE
         WHEN app_contact_rate_limits.reset_at <= now() THEN 1
         ELSE LEAST(app_contact_rate_limits.attempts::bigint + 1, 2147483647)::integer
       END,
       reset_at = CASE
         WHEN app_contact_rate_limits.reset_at <= now()
           THEN now() + $2 * interval '1 millisecond'
         ELSE app_contact_rate_limits.reset_at
       END
     RETURNING attempts,
       GREATEST(1, CEIL(EXTRACT(EPOCH FROM (reset_at - now()))))::integer AS retry_after`,
    [key, windowMs],
  );
  const window = result.rows[0];
  if (!window) throw new Error("Contact rate limit was not recorded.");
  return window.attempts > maxAttempts ? window.retry_after : null;
}

export async function contactRetryAfter(
  request: NextRequest,
  maxAttempts: number,
  windowMs: number,
): Promise<number | null> {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("Contact rate limiting is not configured.");
  }
  const trustCloudflare = process.env.CONTACT_TRUST_CLOUDFLARE_IP?.trim();
  if (trustCloudflare && trustCloudflare !== "true" && trustCloudflare !== "false") {
    throw new Error("Contact proxy trust is not configured correctly.");
  }

  if (Math.random() < 0.01) {
    await query(
      `DELETE FROM app_contact_rate_limits
       WHERE key_hash IN (
         SELECT key_hash FROM app_contact_rate_limits
         WHERE reset_at < now() - interval '1 day'
         ORDER BY reset_at
         LIMIT 1000
         FOR UPDATE SKIP LOCKED
       )`,
    );
  }

  const globalRetry = await consumeWindow(
    hashKey("global", secret),
    GLOBAL_LIMIT,
    GLOBAL_WINDOW_MS,
  );
  if (globalRetry !== null) return globalRetry;

  const address =
    trustCloudflare === "true"
      ? request.headers.get("cf-connecting-ip")?.trim() ?? ""
      : "";
  if (address.length > 45 || !isIP(address)) return null;
  return consumeWindow(hashKey(`client:${address}`, secret), maxAttempts, windowMs);
}
