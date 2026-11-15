import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { isSameOrigin } from "./request-security";

afterEach(() => vi.unstubAllEnvs());

it("uses the runtime site URL instead of the local build-time URL", () => {
  vi.stubEnv("SITE_URL", "https://studio.example.com");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  const request = new NextRequest("https://studio.example.com/api/contact", {
    headers: { origin: "https://studio.example.com" },
  });
  expect(isSameOrigin(request)).toBe(true);
});
