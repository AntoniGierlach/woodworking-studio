import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), isSameOrigin: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/admin-session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));

import { PATCH } from "./route";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const targetId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
function request(data: unknown) {
  return new NextRequest("https://example.com/api/admin/content/order", {
    method: "PATCH", body: JSON.stringify(data), headers: { "content-type": "application/json" },
  });
}

describe("changing admin content order", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.query.mockResolvedValue({ rows: [{ id }], rowCount: 1 });
  });

  it.each(["projects", "services", "woods"])("reorders %s in one database statement", async (type) => {
    expect((await PATCH(request({ type, id, targetId }))).status).toBe(200);
    expect(mocks.query).toHaveBeenCalledOnce();
    expect(mocks.query.mock.calls[0][1]).toEqual([id, targetId]);
  });

  it("returns 404 when a record is missing", async () => {
    mocks.query.mockResolvedValue({ rows: [], rowCount: 0 });
    expect((await PATCH(request({ type: "projects", id, targetId }))).status).toBe(404);
  });

  it("rejects unauthorized and invalid requests", async () => {
    mocks.requireAdmin.mockResolvedValueOnce(false);
    expect((await PATCH(request({ type: "projects", id, targetId }))).status).toBe(401);
    expect((await PATCH(request({ type: "settings", id, targetId }))).status).toBe(422);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("reports database failures", async () => {
    mocks.query.mockRejectedValue(new Error("database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await PATCH(request({ type: "projects", id, targetId }))).status).toBe(503);
    log.mockRestore();
  });
});
