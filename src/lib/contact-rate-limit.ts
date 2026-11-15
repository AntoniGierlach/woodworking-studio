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
  const now = Date.now();
  const result = await query<{ attempts: number; reset_at: number }>(
    `INSERT INTO app_contact_rate_limits (key_hash, attempts, reset_at)
     VALUES ($1, 1, $2 + $3)
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE
         WHEN app_contact_rate_limits.reset_at <= $2 THEN 1
         ELSE MIN(app_contact_rate_limits.attempts + 1, 2147483647)
       END,
       reset_at = CASE
         WHEN app_contact_rate_limits.reset_at <= $2 THEN $2 + $3
         ELSE app_contact_rate_limits.reset_at
       END
     RETURNING attempts, reset_at`,
    [key, now, windowMs],
  );
  const window = result.rows[0];
  if (!window) throw new Error("Contact rate limit was not recorded.");
  return window.attempts > maxAttempts ? Math.max(1, Math.ceil((window.reset_at - now) / 1000)) : null;
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
         WHERE reset_at < $1
         ORDER BY reset_at
         LIMIT 1000
       )`,
      [Date.now() - 86_400_000],
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
