import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  cookies: vi.fn(),
  getAdminConfig: vi.fn(),
  verifyAdminSession: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("./admin-config", () => ({ getAdminConfig: mocks.getAdminConfig }));
vi.mock("./admin-auth", () => ({ verifyAdminSession: mocks.verifyAdminSession }));

import { isAdminAuthenticated } from "./admin-session";

describe("admin session", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.connection.mockResolvedValue(undefined);
    mocks.getAdminConfig.mockReturnValue({ email: "owner@example.com" });
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "test-token" }) });
    mocks.verifyAdminSession.mockResolvedValue(true);
  });

  it("waits for the request before reading and verifying the session", async () => {
    await expect(isAdminAuthenticated()).resolves.toBe(true);
    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.connection.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.cookies.mock.invocationCallOrder[0]);
    expect(mocks.verifyAdminSession).toHaveBeenCalledWith(
      "test-token",
      { email: "owner@example.com" },
    );
  });

  it("propagates request-context errors instead of treating them as logged out", async () => {
    mocks.connection.mockRejectedValue(new Error("request unavailable"));
    await expect(isAdminAuthenticated()).rejects.toThrow("request unavailable");
    expect(mocks.cookies).not.toHaveBeenCalled();
  });
});
