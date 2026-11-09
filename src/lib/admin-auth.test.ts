import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import {
  createAdminSession,
  verifyAdminCredentials,
  verifyAdminSession,
} from "./admin-auth";
import { type AdminConfig } from "./admin-config";

const config: AdminConfig = {
  email: "owner@example.com",
  passwordHash: "",
  sessionSecret: "a".repeat(64),
};

describe("admin authentication", () => {
  it("only accepts the configured administrator credentials", async () => {
    const hash = await bcrypt.hash("correct horse", 4);
    await expect(
      verifyAdminCredentials("owner@example.com", "wrong password", {
        ...config,
        passwordHash: hash,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyAdminCredentials("other@example.com", "correct horse", {
        ...config,
        passwordHash: hash,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyAdminCredentials("OWNER@example.com", "correct horse", {
        ...config,
        passwordHash: hash,
      }),
    ).resolves.toBe(true);
  });

  it("creates a signed session that verifies only with its signing secret", async () => {
    const token = await createAdminSession(config);
    await expect(verifyAdminSession(token, config)).resolves.toBe(true);
    await expect(
      verifyAdminSession(token, {
        ...config,
        sessionSecret: "b".repeat(64),
      }),
    ).resolves.toBe(false);
  });

  it("rejects malformed or absent session tokens", async () => {
    await expect(verifyAdminSession("", config)).resolves.toBe(false);
    await expect(verifyAdminSession("not-a-jwt", config)).resolves.toBe(false);
  });
});
