import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ProjectCarousel, { getVisibleProjects, type CarouselProject } from "./project-carousel";

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => createElement("img", { src, alt: "" }),
}));

const projects: CarouselProject[] = [
  { id: "1", title: "Stół", slug: "stół", imageUrl: "/api/media/1" },
  { id: "2", title: "Szafa", slug: "szafa", imageUrl: "/api/media/2" },
  { id: "3", title: "Komoda", slug: "komoda", imageUrl: null },
  { id: "4", title: "Biurko", slug: "biurko", imageUrl: "/api/media/4" },
];

describe("pokaz realizacji", () => {
  it("wyświetla najwyżej trzy różne projekty i zawija kolejność", () => {
    expect(getVisibleProjects(projects, 0).map(({ project }) => project.id)).toEqual(["4", "1", "2"]);
    expect(getVisibleProjects(projects, 3).map(({ project }) => project.id)).toEqual(["3", "4", "1"]);
    expect(getVisibleProjects(projects.slice(0, 2), 0).map(({ project }) => project.id)).toEqual(["1", "2"]);
    expect(getVisibleProjects(projects.slice(0, 1), 0).map(({ project }) => project.id)).toEqual(["1"]);
    expect(getVisibleProjects([], 0)).toEqual([]);
  });

  it("pokazuje odnośnik do aktywnego projektu i sterowanie", () => {
    const html = renderToStaticMarkup(createElement(ProjectCarousel, { projects }));
    expect(html).toContain('href="/realizacje/st%C3%B3%C5%82"');
    expect(html).toContain("Poprzednia realizacja");
    expect(html).toContain("Następna realizacja");
    expect(html).toContain('class="project-carousel-direction project-carousel-direction-previous"');
    expect(html).toContain('class="project-carousel-direction project-carousel-direction-next"');
    expect(html).not.toContain('class="project-carousel-buttons"');
    expect(html).not.toContain("←");
    expect(html).not.toContain("→");
    expect(html).toContain('href="/realizacje"');
    expect(html.match(/project-carousel-slide /g)).toHaveLength(3);
    expect(html).not.toContain("/api/media/3");
  });

  it("nie pokazuje sterowania dla jednego projektu", () => {
    const html = renderToStaticMarkup(createElement(ProjectCarousel, { projects: projects.slice(0, 1) }));
    expect(html).not.toContain("Następna realizacja");
    expect(html.match(/project-carousel-slide /g)).toHaveLength(1);
  });
});
