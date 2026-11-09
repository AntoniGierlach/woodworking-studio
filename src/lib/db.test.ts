import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), on: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("pg", () => ({
  Pool: class {
    query = mocks.query;
    on = mocks.on;
  },
}));

import { query } from "./db";

describe("database query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
  });

  it("returns query results and passes a copy of the parameters", async () => {
    const result = { rows: [{ id: 1 }] };
    const values = [1] as const;
    mocks.query.mockImplementation((_text, _values, callback) => callback(null, result));

    await expect(query("SELECT $1", values)).resolves.toBe(result);
    expect(mocks.query).toHaveBeenCalledWith("SELECT $1", [1], expect.any(Function));
    expect(mocks.query.mock.calls[0][1]).not.toBe(values);
  });

  it("preserves aggregate connection errors without exposing AggregateError", async () => {
    const cause = new Error("Connection refused");
    const aggregate = new AggregateError([cause], "Connection failed");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.query.mockImplementation((_text, _values, callback) => callback(aggregate));

    const error = await query("SELECT 1").catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(AggregateError);
    expect(error).toHaveProperty("cause", [cause]);
    expect(warning).toHaveBeenCalledWith(
      JSON.stringify({ event: "database_query_aggregate_error" }),
    );
    warning.mockRestore();
  });

  it("propagates other database errors unchanged", async () => {
    const error = new Error("Query failed");
    mocks.query.mockImplementation((_text, _values, callback) => callback(error));
    await expect(query("SELECT 1")).rejects.toBe(error);
  });
});
