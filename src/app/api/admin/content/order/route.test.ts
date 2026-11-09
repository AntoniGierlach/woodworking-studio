import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  isSameOrigin: vi.fn(),
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/admin-session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));
vi.mock("@/lib/db", () => ({ withTransaction: mocks.withTransaction }));
vi.mock("@/lib/reorder", async () => await import("../../../../../lib/reorder"));

import { PATCH } from "./route";
import { NextRequest } from "next/server";

const ids = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
];

function request(data: unknown) {
  return new NextRequest("http://localhost/api/admin/content/order", {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "content-type": "application/json" },
  });
}

describe("changing admin content order", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue(true);
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.withTransaction.mockImplementation(async (operation) =>
      operation({ query: mocks.query }),
    );
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith("SELECT")) return { rows: ids.map((id) => ({ id })) };
      return { rows: [] };
    });
  });

  it.each(["projects", "services", "woods"])("updates all %s atomically in the requested order", async (type) => {
    const response = await PATCH(request({ type, id: ids[2], targetId: ids[0] }));
    expect(response.status).toBe(200);
    expect(mocks.query.mock.calls[0][0]).toContain("SHARE ROW EXCLUSIVE MODE");
    expect(mocks.query.mock.calls[2][1]).toEqual([[ids[2], ids[0], ids[1]]]);
    expect(mocks.withTransaction).toHaveBeenCalledOnce();
  });

  it("does not reorder when a record is missing", async () => {
    const response = await PATCH(request({ type: "projects", id: ids[0], targetId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }));
    expect(response.status).toBe(404);
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("rejects unauthorized and invalid requests", async () => {
    mocks.requireAdmin.mockResolvedValueOnce(false);
    expect((await PATCH(request({ type: "projects", id: ids[0], targetId: ids[1] }))).status).toBe(401);
    expect((await PATCH(request({ type: "settings", id: ids[0], targetId: ids[1] }))).status).toBe(422);
    expect(mocks.withTransaction).not.toHaveBeenCalled();
  });

  it("reports storage errors rather than claiming success", async () => {
    mocks.withTransaction.mockRejectedValue(new Error("storage unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await PATCH(request({ type: "projects", id: ids[0], targetId: ids[1] }))).status).toBe(503);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
