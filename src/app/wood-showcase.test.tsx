import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getWoodTypes: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/content-data", () => ({
  getWoodTypes: mocks.getWoodTypes,
  getContentAssetUrl: (id: string) => `/api/media/${id}`,
}));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => createElement("img", { alt, src }),
}));

import WoodShowcase from "./wood-showcase";

describe("publiczne gatunki drewna", () => {
  beforeEach(() => vi.resetAllMocks());

  it("wyświetla zapisane gatunki i zdjęcia", async () => {
    mocks.getWoodTypes.mockResolvedValue([{ id: "1", title: "Dąb", tone: "Jasny", grain: "Wyraźne", character: "Naturalny", image_id: "zdjecie" }]);
    const html = renderToStaticMarkup(await WoodShowcase());
    expect(html).toContain("Dąb");
    expect(html).toContain("Naturalny");
    expect(html).toContain('src="/api/media/zdjecie"');
  });

  it("rozróżnia brak danych od błędu pobierania", async () => {
    mocks.getWoodTypes.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Baza niedostępna"));
    expect(renderToStaticMarkup(await WoodShowcase())).toContain("pojawią się wkrótce");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(renderToStaticMarkup(await WoodShowcase())).toContain("chwilowo niedostępne");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
