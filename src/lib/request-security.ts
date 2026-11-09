import type { NextRequest } from "next/server";

export function isSameOrigin(request: NextRequest): boolean {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    const expectedOrigin = new URL(
      configuredOrigin || request.nextUrl.origin,
    ).origin;
    return request.headers.get("origin") === expectedOrigin;
  } catch {
    return false;
  }
}
