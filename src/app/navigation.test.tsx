import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContentCollection: vi.fn(),
  getSiteSettings: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/site-settings", () => ({ getSiteSettings: mocks.getSiteSettings }));
vi.mock("@/lib/content-data", () => ({
  getContentCollection: mocks.getContentCollection,
  getContentAssetUrl: (id: string) => `/api/media/${id}`,
  getContentUnavailableNotice: () => ({
    title: "Treści są chwilowo niedostępne",
    message: "Nie udało się pobrać treści. Spróbuj ponownie później.",
  }),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("./site-chrome", () => ({
  SiteLayout: ({ children }: { children: ReactNode }) =>
    createElement("main", null, children),
}));
vi.mock("next/image", () => ({ default: () => null }));

import Home, { generateMetadata } from "./page";
import OfferPage from "./oferta/page";
import ProjectsPage from "./realizacje/page";
import ProjectDetailPage from "./realizacje/[slug]/page";

describe("nawigacja po ofercie i realizacjach", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("prowadzi ze strony głównej do obu podstron", () => {
    const html = renderToStaticMarkup(createElement(Home));
    expect(html).toContain('href="/oferta"');
    expect(html).toContain('href="/realizacje"');
    expect(html).not.toContain('href="#oferta"');
    expect(html).not.toContain('href="#realizacje"');
    expect(html.match(/Zobacz pełną ofertę/g)).toHaveLength(1);
  });

  it("używa ustawień SEO na stronie głównej", async () => {
    mocks.getSiteSettings.mockResolvedValue({
      status: "available",
      settings: { seo_title: "Meble na wymiar", seo_description: "Meble z dębu" },
    });
    expect(await generateMetadata()).toEqual({
      title: "Meble na wymiar",
      description: "Meble z dębu",
    });
    mocks.getSiteSettings.mockResolvedValue({ status: "unavailable" });
    expect(await generateMetadata()).toEqual({});
  });

  it("pokazuje widoczny odnośnik kontaktowy dla usługi", async () => {
    mocks.getContentCollection.mockResolvedValue([
      { id: "1", title: "Stół dębowy", slug: "stol-debowy" },
    ]);
    const html = renderToStaticMarkup(await OfferPage());
    expect(html).toContain('href="/kontakt"');
    expect(html).toContain("Zapytaj o usługę");
    expect(html).toContain('href="/realizacje"');
  });

  it("umożliwia dalszą nawigację przy pustej ofercie i galerii", async () => {
    mocks.getContentCollection.mockResolvedValue([]);
    const offer = renderToStaticMarkup(await OfferPage());
    const projects = renderToStaticMarkup(await ProjectsPage());
    expect(offer).toContain('href="/kontakt"');
    expect(offer).toContain('href="/realizacje"');
    expect(projects).toContain('href="/oferta"');
  });

  it("łączy opublikowaną realizację ze szczegółami i powrotem do galerii", async () => {
    const project = { id: "1", title: "Stół dębowy", slug: "stol-debowy" };
    mocks.getContentCollection.mockResolvedValue([project]);
    const list = renderToStaticMarkup(await ProjectsPage());
    const detail = renderToStaticMarkup(
      await ProjectDetailPage({ params: Promise.resolve({ slug: project.slug }) }),
    );
    expect(list).toContain('href="/realizacje/stol-debowy"');
    expect(detail).toContain('href="/realizacje"');
    expect(detail).toContain('href="/kontakt"');
    expect(detail).toContain(project.title);
  });

  it("zachowuje powrót do galerii, gdy szczegóły są niedostępne", async () => {
    mocks.getContentCollection.mockRejectedValue(new Error("Database unavailable"));
    const html = renderToStaticMarkup(
      await ProjectDetailPage({ params: Promise.resolve({ slug: "stol" }) }),
    );
    expect(html).toContain("Treści są chwilowo niedostępne");
    expect(html).toContain('href="/realizacje"');
    expect(html).not.toContain("←");
    expect(html).toContain('href="/kontakt"');
  });

  it("nie pokazuje nieopublikowanej lub nieistniejącej realizacji", async () => {
    mocks.getContentCollection.mockResolvedValue([]);
    await expect(
      ProjectDetailPage({ params: Promise.resolve({ slug: "brak" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
