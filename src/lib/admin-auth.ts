import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import type { AdminConfig } from "./admin-config";

const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const SESSION_ISSUER = "woodworking-studio";
const SESSION_AUDIENCE = "admin";

function signingKey(config: AdminConfig): Uint8Array {
  return new TextEncoder().encode(config.sessionSecret);
}

export async function verifyAdminCredentials(
  email: string,
  password: string,
  config: AdminConfig,
): Promise<boolean> {
  const emailMatches = email.trim().toLowerCase() === config.email;
  const passwordIsValidLength =
    Buffer.byteLength(password, "utf8") > 0 &&
    Buffer.byteLength(password, "utf8") <= 72;

  let passwordMatches = false;
  try {
    passwordMatches = await bcrypt.compare(
      emailMatches && passwordIsValidLength ? password : "",
      config.passwordHash,
    );
  } catch {
    return false;
  }

  return emailMatches && passwordIsValidLength && passwordMatches;
}

export async function createAdminSession(
  config: AdminConfig,
  now = new Date(),
): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setSubject(config.email)
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(now.getTime() / 1000) + SESSION_DURATION_SECONDS)
    .sign(signingKey(config));
}

export async function verifyAdminSession(
  token: string,
  config: AdminConfig,
  now = new Date(),
): Promise<boolean> {
  if (!token || token.length > 4096) return false;

  try {
    const { payload } = await jwtVerify(token, signingKey(config), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      currentDate: now,
    });
    return payload.sub === config.email && payload.role === "admin";
  } catch {
    return false;
  }
}
