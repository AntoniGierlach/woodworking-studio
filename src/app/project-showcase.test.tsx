import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getProjectPreviews: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/content-data", () => ({
  getProjectPreviews: mocks.getProjectPreviews,
  getContentAssetUrl: (id: string) => `/api/media/${id}`,
}));
vi.mock("./project-carousel", () => ({
  default: ({ projects }: { projects: Array<{ title: string; imageUrl: string | null }> }) =>
    createElement("div", null, projects.map((project) =>
      createElement("span", { key: project.title }, `${project.title}:${project.imageUrl}`),
    ) as ReactNode),
}));

import ProjectShowcase from "./project-showcase";

describe("projekty na stronie głównej", () => {
  beforeEach(() => vi.resetAllMocks());

  it("przekazuje wyłącznie zdjęcie główne projektu", async () => {
    mocks.getProjectPreviews.mockResolvedValue([
      { id: "1", title: "Stół", slug: "stol", cover_image: "cover", project_images: [{ file: "other" }] },
    ]);
    const html = renderToStaticMarkup(await ProjectShowcase());
    expect(html).toContain("Stół:/api/media/cover");
    expect(html).not.toContain("other");
  });

  it("rozróżnia brak projektów od błędu pobierania", async () => {
    mocks.getProjectPreviews.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Database unavailable"));
    expect(renderToStaticMarkup(await ProjectShowcase())).toContain("Pierwsze realizacje pojawią się tutaj");
    const unavailable = renderToStaticMarkup(await ProjectShowcase());
    expect(unavailable).toContain("Realizacje są chwilowo niedostępne");
    expect(unavailable).toContain('href="/realizacje"');
  });
});
