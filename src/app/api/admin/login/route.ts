import { NextResponse, type NextRequest } from "next/server";
import { createAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";
import { getAdminConfig } from "@/lib/admin-config";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/admin-session";
import { query } from "@/lib/db";
import { createHash } from "node:crypto";
import { isSameOrigin } from "@/lib/request-security";

function getClientKey(request: NextRequest, secret: string): string {
  const address =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  return createHash("sha256")
    .update(`${secret}\0${address}`)
    .digest("hex");
}

async function consumeLoginAttempt(key: string): Promise<boolean> {
  const result = await query<{ blocked: boolean }>(
    `WITH expired AS (
       DELETE FROM app_admin_login_attempts
       WHERE window_started_at < now() - interval '1 day'
      RETURNING key_hash
    )
     INSERT INTO app_admin_login_attempts (key_hash, attempts, window_started_at)
     VALUES ($1, 1, now())
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE
         WHEN app_admin_login_attempts.window_started_at < now() - interval '15 minutes' THEN 1
         ELSE app_admin_login_attempts.attempts + 1
       END,
       window_started_at = CASE
         WHEN app_admin_login_attempts.window_started_at < now() - interval '15 minutes' THEN now()
         ELSE app_admin_login_attempts.window_started_at
       END,
       locked_until = CASE
         WHEN app_admin_login_attempts.window_started_at < now() - interval '15 minutes' THEN NULL
         WHEN app_admin_login_attempts.locked_until > now() THEN app_admin_login_attempts.locked_until
         WHEN app_admin_login_attempts.attempts + 1 >= 10 THEN now() + interval '15 minutes'
         ELSE app_admin_login_attempts.locked_until
       END
     RETURNING (locked_until IS NOT NULL AND locked_until > now()) AS blocked`,
    [key],
  );
  return result.rows[0]?.blocked === true;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > 4096) {
    return NextResponse.json({ error: "Invalid request." }, { status: 413 });
  }

  let config;
  try {
    config = getAdminConfig();
  } catch {
    return NextResponse.json(
      { error: "Administrator authentication is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const credentials =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const email =
    typeof credentials.email === "string" ? credentials.email.slice(0, 320) : "";
  const password =
    typeof credentials.password === "string" ? credentials.password.slice(0, 1024) : "";

  try {
    const blocked = await consumeLoginAttempt(getClientKey(request, config.sessionSecret));
    if (blocked) {
      return NextResponse.json(
        { error: "Za dużo prób logowania. Spróbuj ponownie za 15 minut." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }

    if (!(await verifyAdminCredentials(email, password, config))) {
      return NextResponse.json(
        { error: "Nieprawidłowy e-mail lub hasło." },
        { status: 401 },
      );
    }

    await query("DELETE FROM app_admin_login_attempts WHERE key_hash = $1", [
      getClientKey(request, config.sessionSecret),
    ]);

    const token = await createAdminSession(config);
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "admin_login_failed",
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return NextResponse.json(
      { error: "Nie udało się zalogować. Spróbuj ponownie później." },
      { status: 503 },
    );
  }
}
