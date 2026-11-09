import { spawnSync } from "node:child_process";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

function runHashScript(password: string) {
  return spawnSync(
    process.execPath,
    [
      join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
      join("scripts", "hash-admin-password.ts"),
    ],
    { encoding: "utf8", env: { ...process.env, ADMIN_PASSWORD: password } },
  );
}

describe("administrator password hash script", () => {
  it("generates a bcrypt hash of the supplied password", async () => {
    const password = "test-password-123";
    const result = runHashScript(password);
    expect(result.status).toBe(0);
    await expect(bcrypt.compare(password, result.stdout.trim())).resolves.toBe(true);
  });

  it("rejects passwords that are too short", () => {
    const result = runHashScript("short");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("between 12 and 72 bytes");
  });
});
