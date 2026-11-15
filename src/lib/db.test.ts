import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), bind: vi.fn(), all: vi.fn(), batch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { DB: { prepare: mocks.prepare, batch: mocks.batch } } }),
}));

import { batch, query } from "./db";

describe("D1 database", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.prepare.mockReturnValue({ bind: mocks.bind });
    mocks.bind.mockReturnValue({ all: mocks.all });
  });

  it("binds numbered parameters and converts booleans", async () => {
    mocks.all.mockResolvedValue({ results: [{ id: "x" }], meta: { changes: 0 } });
    expect(await query("SELECT $2, $1", ["value", true])).toEqual({ rows: [{ id: "x" }], rowCount: 1 });
    expect(mocks.prepare).toHaveBeenCalledWith("SELECT ?2, ?1");
    expect(mocks.bind).toHaveBeenCalledWith("value", 1);
  });

  it("passes statements to D1 as one atomic batch and propagates errors", async () => {
    const error = new Error("D1 unavailable");
    mocks.batch.mockRejectedValue(error);
    await expect(batch([{ sql: "INSERT INTO example VALUES ($1)", values: ["x"] }])).rejects.toBe(error);
    expect(mocks.batch).toHaveBeenCalledOnce();
  });
});
