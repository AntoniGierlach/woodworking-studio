import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getContentCollection: vi.fn() }));
vi.mock("@/lib/content-data", () => ({ getContentCollection: mocks.getContentCollection }));

import sitemap from "./sitemap";
import robots from "./robots";

describe("public SEO routes", () => {
  beforeEach(() => vi.resetAllMocks());

  it("includes canonical static pages and published project URLs with database dates", async () => {
    mocks.getContentCollection.mockResolvedValue([
      { slug: "stol-debowy", date_created: "2026-01-01 10:00:00", date_updated: "2026-02-02 12:00:00" },
      { slug: "projekt szkic", date_created: null, date_updated: null },
    ]);

    const entries = await sitemap();
    expect(mocks.getContentCollection).toHaveBeenCalledWith("projects");
    expect(entries.map(({ url }) => url)).toEqual([
      "https://www.puszczawik.com/",
      "https://www.puszczawik.com/oferta",
      "https://www.puszczawik.com/realizacje",
      "https://www.puszczawik.com/kontakt",
      "https://www.puszczawik.com/realizacje/stol-debowy",
      "https://www.puszczawik.com/realizacje/projekt%20szkic",
    ]);
    expect(entries[2].lastModified).toEqual(new Date("2026-02-02T12:00:00Z"));
    expect(entries[5].lastModified).toBeUndefined();
    expect(entries[0].lastModified).toBeUndefined();
  });

  it("keeps static pages in the sitemap if D1 is unavailable", async () => {
    mocks.getContentCollection.mockRejectedValue(new Error("D1 unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sitemap()).toHaveLength(4);
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it("allows pages and media while disallowing the admin area and other API routes", () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: ["/", "/api/media/"],
        disallow: ["/admin", "/api/"],
      },
      sitemap: "https://www.puszczawik.com/sitemap.xml",
      host: "https://www.puszczawik.com",
    });
  });
});