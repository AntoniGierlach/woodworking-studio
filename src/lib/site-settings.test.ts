import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("./db", () => ({ query: vi.fn() }));

import { query } from "./db";
import { getSiteSettings } from "./site-settings";

describe("ustawienia witryny", () => {
  beforeEach(() => vi.resetAllMocks());

  it("pobiera tylko publiczne ustawienia", async () => {
    vi.mocked(query).mockResolvedValueOnce({
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [{ company_name: "Pracownia" }],
    });
    const result = await getSiteSettings();
    expect(result).toEqual({ status: "available", settings: { company_name: "Pracownia" } });
    expect(vi.mocked(query).mock.calls[0][0]).toContain("FROM app_site_settings WHERE id = 1");
    expect(vi.mocked(query).mock.calls[0][0]).not.toContain("service_area");
  });

  it("raportuje niedostępność bazy", async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error("database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getSiteSettings()).toEqual({ status: "unavailable" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("site_settings_read_failed"));
    log.mockRestore();
  });
});
