import { describe, expect, it } from "vitest";
import { getAdminConfig, slugify } from "./admin-config";

describe("getAdminConfig", () => {
  it("requires an admin email, password hash, and strong session secret", () => {
    expect(() => getAdminConfig({})).toThrow(
      "Admin authentication is not configured.",
    );
    expect(() =>
      getAdminConfig({
        ADMIN_EMAIL: "owner@example.com",
        ADMIN_PASSWORD_HASH: "$2b$12$placeholder",
        ADMIN_SESSION_SECRET: "too-short",
      }),
    ).toThrow("Admin authentication is not configured.");
  });

  it("normalizes the configured email and accepts a sufficiently long secret", () => {
    expect(
      getAdminConfig({
        ADMIN_EMAIL: "  OWNER@example.com ",
        ADMIN_PASSWORD_HASH: "$2b$12$placeholder",
        ADMIN_SESSION_SECRET: "a".repeat(64),
      }),
    ).toEqual({
      email: "owner@example.com",
      passwordHash: "$2b$12$placeholder",
      sessionSecret: "a".repeat(64),
    });
  });
});

describe("slugify", () => {
  it("creates a URL-safe slug from Polish text", () => {
    expect(slugify("Dębowa ława na wymiar!")).toBe("debowa-lawa-na-wymiar");
  });

  it("collapses separators and handles empty input", () => {
    expect(slugify("  Dąb___i   orzech  ")).toBe("dab-i-orzech");
    expect(slugify(" !!! ")).toBe("");
  });
});
