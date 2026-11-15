import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getContentCollection: vi.fn() }));
vi.mock("@/lib/content-data", () => ({
  getContentCollection: mocks.getContentCollection,
  getContentAssetUrl: (id: string) => `/api/media/${id}`,
  getContentUnavailableNotice: () => ({ title: "Błąd", message: "Spróbuj ponownie." }),
}));
vi.mock("../site-chrome", () => ({
  SiteLayout: ({ children }: { children: ReactNode }) => createElement("main", null, children),
}));

import OfferPage from "./page";

describe("lista ofert", () => {
  beforeEach(() => vi.resetAllMocks());

  it("udostępnia wszystkie oferty w responsywnej siatce i zachowuje ich kolejność", async () => {
    mocks.getContentCollection.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: String(i), title: `Oferta ${i + 1}` })),
    );
    const html = renderToStaticMarkup(await OfferPage());
    expect(html).toContain("offer-list");
    expect(html).not.toContain("offer-list-scroll");
    expect(html).not.toContain('tabindex="0"');
    expect(html.match(/class="service-item offer-item"/g)).toHaveLength(5);
    expect(html.indexOf("Oferta 1")).toBeLessThan(html.indexOf("Oferta 5"));
  });

  it("zachowuje stan pustej listy bez kart", async () => {
    mocks.getContentCollection.mockResolvedValue([]);
    const html = renderToStaticMarkup(await OfferPage());
    expect(html).toContain("Lista usług jest w przygotowaniu");
    expect(html).not.toContain("offer-list-scroll");
  });

  it("wyświetla cenę produktu lub szacowany przedział", async () => {
    mocks.getContentCollection.mockResolvedValue([
      { id: "1", title: "Stół", price: "~300-500 zł" },
    ]);
    const html = renderToStaticMarkup(await OfferPage());
    expect(html).toContain("~300-500 zł");
    expect(html).toContain("Cena");
  });

  it("rozwija pełną treść długiego opisu na żądanie", async () => {
    const description = "Opis mebla ".repeat(30);
    mocks.getContentCollection.mockResolvedValue([
      { id: "1", title: "Stół", content: description },
    ]);
    const html = renderToStaticMarkup(await OfferPage());
    expect(html).toContain("<details");
    expect(html).toContain("Pełny opis");
    expect(html).toContain(description.trim());
  });

  it("ładuje pierwsze zdjęcia od razu, a kolejne dopiero w razie potrzeby", async () => {
    mocks.getContentCollection.mockResolvedValue(
      Array.from({ length: 4 }, (_, i) => ({ id: String(i), title: `Oferta ${i + 1}`, image: String(i) })),
    );
    const html = renderToStaticMarkup(await OfferPage());
    const images = html.match(/<img[^>]*class="offer-image"[^>]*>/g) ?? [];
    expect(images).toHaveLength(4);
    expect(images.slice(0, 3).every((image) => image.includes('loading="eager"'))).toBe(true);
    expect(images[3]).toContain('loading="lazy"');
    expect(images.every((image) => image.includes("srcSet=") || image.includes("srcset="))).toBe(true);
  });
});
