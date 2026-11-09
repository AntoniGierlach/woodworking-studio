import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

import { AdminLoginForm } from "./admin/login-form";
import ContactForm from "./contact-form";
import MobileNavigation from "./mobile-navigation";
import ProjectCarousel from "./project-carousel";

describe("ikony i nawigacja", () => {
  it("pozostawia menu i linki nawigacyjne bez ikon", () => {
    const html = renderToStaticMarkup(createElement(MobileNavigation, {
      navigation: [{ href: "/oferta", label: "Oferta" }],
    }));
    expect(html).toContain("Menu");
    expect(html).toContain('href="/oferta"');
    expect(html).not.toContain("<svg");
  });

  it("dodaje dekoracyjne ikony do czynności formularzy", () => {
    for (const html of [
      renderToStaticMarkup(createElement(AdminLoginForm)),
      renderToStaticMarkup(createElement(ContactForm)),
    ]) {
      expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
      expect(html).toContain('type="submit"');
    }
  });

  it("używa ikony dla brakującego zdjęcia bez ikon w sterowaniu karuzelą", () => {
    const html = renderToStaticMarkup(createElement(ProjectCarousel, {
      projects: [
        { id: "1", title: "Stół", slug: "stol", imageUrl: null },
        { id: "2", title: "Szafa", slug: "szafa", imageUrl: null },
      ],
    }));
    expect(html).toContain("lucide-image-off");
    expect(html).toMatch(/class="project-carousel-direction project-carousel-direction-previous"[^>]*><\/button>/);
    expect(html).toMatch(/class="project-carousel-direction project-carousel-direction-next"[^>]*><\/button>/);
  });
});
