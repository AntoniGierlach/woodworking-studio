import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OfferDescription from "./offer-description";

describe("opis oferty", () => {
  it("wyświetla oba opisy z zachowaniem podziału na wiersze", () => {
    const html = renderToStaticMarkup(createElement(OfferDescription, {
      shortDescription: "Dąb",
      content: "Pierwszy wiersz\nDrugi wiersz",
    }));
    expect(html).toContain('class="offer-copy-intro">Dąb');
    expect(html).toContain('class="offer-copy-content">Pierwszy wiersz\nDrugi wiersz');
  });

  it("nie dodaje pustego bloku, jeśli nie ma opisu", () => {
    expect(renderToStaticMarkup(createElement(OfferDescription, {}))).toBe("");
  });
});
