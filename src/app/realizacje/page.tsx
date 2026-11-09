import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContentNotice from "../content-notice";
import {
  getContentAssetUrl,
  getContentCollection,
  getContentUnavailableNotice,
} from "@/lib/content-data";
import { SiteLayout } from "../site-chrome";

export const metadata: Metadata = {
  title: "Realizacje | Meble z naturalnego drewna",
  description:
    "Galeria mebli z naturalnego drewna opublikowanych przez pracownię.",
};

export const instant = false;

type Project = {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  short_description?: string | null;
  cover_image?: string | { id: string } | null;
};

export default async function ProjectsPage() {
  let projects: Project[];
  try {
    projects = await getContentCollection<Project>("projects", {
      "filter[status][_eq]": "published",
      fields: "*,cover_image.*",
      sort: "sort",
    });
  } catch {
    const notice = getContentUnavailableNotice();
    return (
      <SiteLayout>
        <section className="inner-page">
          <div className="inner-page-heading page-width">
            <p className="eyebrow">GALERIA PRACOWNI</p>
            <h1>
              Realizacje
              <br />
              <em>z naturalnego drewna.</em>
            </h1>
          </div>
          <div className="page-width">
            <ContentNotice title={notice.title}>{notice.message}</ContentNotice>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section aria-labelledby="projects-page-title" className="inner-page">
        <div className="inner-page-heading page-width">
          <p className="eyebrow">GALERIA PRACOWNI</p>
          <h1 id="projects-page-title">
            Realizacje
            <br />
            <em>z naturalnego drewna.</em>
          </h1>
          <p>
            Każdy projekt ma własne proporcje, funkcję i rysunek drewna.
            Poznaj meble i projekty wykonane przez pracownię.
          </p>
        </div>
        <div className="page-width project-grid">
          {projects.length === 0 ? (
            <div className="content-notice project-empty">
              <p className="eyebrow">REALIZACJE</p>
              <h2>Pierwsze realizacje pojawią się tutaj</h2>
              <p>
                Galeria czeka na zdjęcia i opisy dodane przez pracownię.
                Przykładowe projekty nie są przedstawiane jako faktyczne
                realizacje.
              </p>
              <Link className="button button-dark" href="/oferta">
                Poznaj ofertę
              </Link>
            </div>
          ) : (
            projects.map((project, index) => (
              <article className="project-card" key={project.id}>
                <Link
                  aria-label={`Zobacz realizację: ${project.title}`}
                  className="project-card-link"
                  href={`/realizacje/${encodeURIComponent(project.slug)}`}
                >
                  {project.cover_image ? (
                    <span className="project-card-image">
                      <Image
                        alt={`${project.title} — zdjęcie realizacji`}
                        fill
                        sizes="(max-width: 760px) 100vw, 50vw"
                        src={getContentAssetUrl(
                          typeof project.cover_image === "string"
                            ? project.cover_image
                            : project.cover_image.id,
                        )}
                      />
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="project-card-placeholder"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                  <span className="project-card-meta">
                    {project.category ?? "Realizacja"}
                  </span>
                  <h2>{project.title}</h2>
                  {project.short_description && (
                    <p>{project.short_description}</p>
                  )}
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
