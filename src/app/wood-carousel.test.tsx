import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src, fill, sizes }: { alt: string; src: string; fill: boolean; sizes: string }) =>
    createElement("img", { alt, src, "data-fill": String(fill), sizes }),
}));

import WoodCarousel from "./wood-carousel";

const woods = ["Dąb", "Orzech", "Jesion"].map((title, index) => ({
  id: String(index),
  title,
  tone: "Ciepły",
  grain: "Wyraziste",
  character: "Naturalny",
  imageUrl: index === 0 ? "/api/media/test" : null,
}));

describe("gatunki drewna", () => {
  it("pokazuje dane i zdjęcie, a przy większej liczbie umożliwia zatrzymanie ruchu", () => {
    const html = renderToStaticMarkup(createElement(WoodCarousel, { woods }));
    expect(html).toContain("Próbka drewna: Dąb");
    expect(html).toContain('<div class="wood-kind-image"><img');
    expect(html).toContain('data-fill="true"');
    expect(html).toContain("<dt>Charakterystyka</dt>");
    expect(html).not.toContain("<dt>Wrażenie</dt>");
    expect(html).toContain('aria-label="Zatrzymaj przesuwanie"');
    expect(html).toContain("lucide-pause");
    expect(html).not.toContain(">Zatrzymaj przesuwanie</button>");
    expect(html).toContain('aria-hidden="true" class="wood-guide-list wood-carousel-copy"');
    expect(html).toContain("Jesion");
  });

  it("nie uruchamia przesuwania dla dwóch gatunków i opisuje pustą listę", () => {
    const html = renderToStaticMarkup(createElement(WoodCarousel, { woods: woods.slice(0, 2) }));
    expect(html).not.toContain("Zatrzymaj przesuwanie");
    expect(renderToStaticMarkup(createElement(WoodCarousel, { woods: [] }))).toContain("pojawią się wkrótce");
  });
});
