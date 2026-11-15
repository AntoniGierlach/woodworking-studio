import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ context: vi.fn(), prepare: vi.fn(), bind: vi.fn(), all: vi.fn(), batch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.context,
}));

import { batch, query } from "./db";

describe("D1 database", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.context.mockResolvedValue({ env: { DB: { prepare: mocks.prepare, batch: mocks.batch } } });
    mocks.prepare.mockReturnValue({ bind: mocks.bind });
    mocks.bind.mockReturnValue({ all: mocks.all });
  });

  it("binds numbered parameters and converts booleans", async () => {
    mocks.all.mockResolvedValue({ results: [{ id: "x" }], meta: { changes: 0 } });
    expect(await query("SELECT $2, $1", ["value", true])).toEqual({ rows: [{ id: "x" }], rowCount: 1 });
    expect(mocks.prepare).toHaveBeenCalledWith("SELECT ?2, ?1");
    expect(mocks.bind).toHaveBeenCalledWith("value", 1);
    expect(mocks.context).toHaveBeenCalledWith({ async: true });
  });

  it("passes statements to D1 as one atomic batch and propagates errors", async () => {
    const error = new Error("D1 unavailable");
    mocks.batch.mockRejectedValue(error);
    await expect(batch([{ sql: "INSERT INTO example VALUES ($1)", values: ["x"] }])).rejects.toBe(error);
    expect(mocks.batch).toHaveBeenCalledOnce();
    expect(mocks.context).toHaveBeenCalledWith({ async: true });
  });

  it("propagates errors when the asynchronous context cannot be obtained", async () => {
    const error = new Error("Cloudflare context unavailable");
    mocks.context.mockRejectedValue(error);
    await expect(query("SELECT 1")).rejects.toBe(error);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
});
