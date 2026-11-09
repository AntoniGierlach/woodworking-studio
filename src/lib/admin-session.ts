import { cookies } from "next/headers";
import { connection } from "next/server";
import { getAdminConfig } from "./admin-config";
import { verifyAdminSession } from "./admin-auth";

export const ADMIN_SESSION_COOKIE = "woodworking_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export async function isAdminAuthenticated(): Promise<boolean> {
  await connection();
  try {
    const config = getAdminConfig();
    const cookieStore = await cookies();
    return verifyAdminSession(
      cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? "",
      config,
    );
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<boolean> {
  return isAdminAuthenticated();
}
