export { slugify } from "./slugify";

export interface AdminConfig {
  email: string;
  passwordHash: string;
  sessionSecret: string;
}

export function getAdminConfig(
  env: Record<string, string | undefined> = process.env,
): AdminConfig {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = env.ADMIN_PASSWORD_HASH?.trim();
  const sessionSecret = env.ADMIN_SESSION_SECRET?.trim();

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !passwordHash ||
    !sessionSecret ||
    Buffer.byteLength(sessionSecret, "utf8") < 32
  ) {
    throw new Error("Admin authentication is not configured.");
  }

  return { email, passwordHash, sessionSecret };
}
