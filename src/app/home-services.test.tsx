import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getContentCollection: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/content-data", () => ({
  getContentCollection: mocks.getContentCollection,
  getContentAssetUrl: (id: string) => `/api/media/${id}`,
}));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => createElement("img", { alt, src }),
}));

import HomeServices from "./home-services";

describe("oferta na stronie głównej", () => {
  beforeEach(() => vi.resetAllMocks());

  it("wyświetla publikowane wpisy oferty z opisem, ceną i zdjęciem", async () => {
    mocks.getContentCollection.mockResolvedValue([{
      id: "1",
      title: "Ława dębowa",
      short_description: "Ręcznie wykonana.",
      content: "Lite drewno dębowe.",
      price: "od 1200 zł",
      image: "media-id",
    }]);

    const html = renderToStaticMarkup(await HomeServices());

    expect(mocks.getContentCollection).toHaveBeenCalledWith("services");
    expect(html).toContain("Ława dębowa");
    expect(html).toContain("Ręcznie wykonana.");
    expect(html).toContain("Lite drewno dębowe.");
    expect(html).toContain("od 1200 zł");
    expect(html).toContain('src="/api/media/media-id"');
  });
});