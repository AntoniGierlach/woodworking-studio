import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/lib/slugify", async () => await import("../../lib/slugify"));

import { AdminDashboard } from "./dashboard";

describe("formularz oferty w panelu", () => {
  it("wyświetla listę, formularz i podgląd bez zbędnych pól", () => {
    const html = renderToStaticMarkup(createElement(AdminDashboard));
    expect(html).toContain('aria-label="Lista usług"');
    expect(html).toContain('aria-label="Podgląd publikacji"');
    expect(html).toContain('name="slug"');
    expect(html).toMatch(/class="admin-publication-fields".*name="slug".*name="status"/);
    expect(html).not.toContain("readOnly");
    expect(html).toContain("Adres tworzy się z nazwy, ale możesz go zmienić ręcznie.");
    expect(html).not.toContain('name="short_description"');
    expect(html).not.toContain('name="image_id"');
    expect(html).not.toContain('name="category"');
    expect(html).not.toContain('name="sort"');
    expect(html).toContain('id="admin-cover-upload"');
  });
});
