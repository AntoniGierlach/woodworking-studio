"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

export type CarouselProject = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
};

export function getVisibleProjects(projects: CarouselProject[], active: number) {
  const count = projects.length;
  if (count === 0) return [];
  const center = ((active % count) + count) % count;
  return [
    ...(count > 2 ? [{ project: projects[(center - 1 + count) % count], position: "previous" }] : []),
    { project: projects[center], position: "current" },
    ...(count > 1 ? [{ project: projects[(center + 1) % count], position: "next" }] : []),
  ];
}

export default function ProjectCarousel({ projects }: { projects: CarouselProject[] }) {
  const [slide, setSlide] = useState({ active: 0, direction: 0 });
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [timerVersion, setTimerVersion] = useState(0);
  const count = projects.length;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || interacting || hovering || reducedMotion) return;
    const timer = window.setInterval(() => {
      setSlide(({ active }) => ({ active: (active + 1) % count, direction: 1 }));
    }, 10000);
    return () => window.clearInterval(timer);
  }, [count, paused, interacting, hovering, reducedMotion, timerVersion]);

  function move(direction: number) {
    setSlide(({ active }) => ({ active: (active + direction + count) % count, direction }));
    setTimerVersion((version) => version + 1);
  }

  if (!count) return null;

  return (
    <div
      aria-label="Pokaz realizacji"
      aria-roledescription="karuzela"
      className="project-carousel"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
      }}
      onFocusCapture={() => setInteracting(true)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      role="region"
    >
      <div className={`project-carousel-stage${count === 1 ? " project-carousel-single" : ""}`}>
        {getVisibleProjects(projects, slide.active).map(({ project, position }) => {
          const wraps = count === 3 && (
            (slide.direction === 1 && position === "next") ||
            (slide.direction === -1 && position === "previous")
          );
          return (
            <div
              className={`project-carousel-slide project-carousel-${position}${wraps ? " project-carousel-wrap" : ""}`}
              key={project.id}
            >
              {project.imageUrl ? (
                <Image alt="" fill sizes="(max-width: 760px) 75vw, 45vw" src={project.imageUrl} />
              ) : (
                <span className="project-carousel-placeholder" aria-hidden="true"><ImageOff /></span>
              )}
              {position === "current" && (
                <Link
                  aria-label={`Zobacz realizację: ${project.title}`}
                  className="project-carousel-link"
                  href={`/realizacje/${encodeURIComponent(project.slug)}`}
                />
              )}
            </div>
          );
        })}
        {count > 1 && (
          <>
            <button
              type="button"
              className="project-carousel-direction project-carousel-direction-previous"
              onClick={() => move(-1)}
              aria-label="Poprzednia realizacja"
            />
            <button
              type="button"
              className="project-carousel-direction project-carousel-direction-next"
              onClick={() => move(1)}
              aria-label="Następna realizacja"
            />
          </>
        )}
      </div>
      <div className="project-carousel-caption" aria-live={paused || interacting || hovering || reducedMotion ? "polite" : "off"} aria-atomic="true">
        <span>{String((slide.active % count) + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
        <h3>{projects[slide.active % count].title}</h3>
      </div>
      <div className="project-carousel-controls">
        <Link className="project-carousel-all" href="/realizacje">Zobacz wszystkie realizacje</Link>
      </div>
    </div>
  );
}
