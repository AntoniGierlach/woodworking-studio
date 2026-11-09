import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentNotice from "../../content-notice";
import {
  getContentAssetUrl,
  getContentCollection,
  getContentUnavailableNotice,
} from "@/lib/content-data";
import { SiteLayout } from "../../site-chrome";

type AssetReference = string | { id: string };

type Project = {
  title: string;
  slug: string;
  category?: string | null;
  short_description?: string | null;
  description?: string | null;
  cover_image?: AssetReference | null;
  project_images?: Array<{
    id: string | number;
    file: AssetReference;
    alt?: string | null;
    sort?: number;
  }>;
};

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export const instant = false;

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Realizacja ${slug} | Meble z naturalnego drewna`,
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  let project: Project | undefined;
  try {
    const projects = await getContentCollection<Project>("projects", {
      "filter[slug][_eq]": slug,
      "filter[status][_eq]": "published",
      fields: "*,cover_image.*,project_images.*,project_images.file.*",
      "deep[project_images][_sort]": "sort",
      limit: "1",
    });
    project = projects[0];
  } catch {
    const notice = getContentUnavailableNotice();
    return (
      <SiteLayout>
        <section className="inner-page page-width">
          <Link className="button button-dark section-action" href="/realizacje">
            Wróć do realizacji
          </Link>
          <ContentNotice title={notice.title}>{notice.message}</ContentNotice>
        </section>
      </SiteLayout>
    );
  }

  if (!project) {
    notFound();
  }

  return (
    <SiteLayout>
      <article aria-labelledby="project-title" className="inner-page">
        <div className="inner-page-heading page-width">
          <Link className="button button-dark" href="/realizacje">
            Wróć do realizacji
          </Link>
          <p className="eyebrow project-detail-category">
            {project.category ?? "REALIZACJA"}
          </p>
          <h1 id="project-title">{project.title}</h1>
          {project.short_description && (
            <p>{project.short_description}</p>
          )}
        </div>
        {project.cover_image && (
          <figure className="page-width project-detail-cover">
            <Image
              alt={`${project.title} — zdjęcie realizacji`}
              fill
              priority
              sizes="(max-width: 760px) 100vw, 90vw"
              src={getContentAssetUrl(
                typeof project.cover_image === "string"
                  ? project.cover_image
                  : project.cover_image.id,
              )}
            />
          </figure>
        )}
        {project.description && (
          <div className="page-width project-detail-copy">
            <p>{project.description}</p>
          </div>
        )}
        {project.project_images && project.project_images.length > 0 && (
          <div
            aria-label={`Galeria realizacji: ${project.title}`}
            className="page-width project-detail-gallery"
          >
            {project.project_images.map((image) => (
              <figure key={image.id}>
                <Image
                  alt={image.alt?.trim() || project.title}
                  fill
                  sizes="(max-width: 760px) 100vw, 50vw"
                  src={getContentAssetUrl(
                    typeof image.file === "string" ? image.file : image.file.id,
                  )}
                />
              </figure>
            ))}
          </div>
        )}
        <div className="page-width studio-callout">
          <p className="eyebrow">PODOBNY PROJEKT?</p>
          <h2>Porozmawiajmy o meblu dopasowanym do Twojej przestrzeni.</h2>
          <Link className="button button-dark" href="/kontakt">
            Napisz do pracowni  
          </Link>
        </div>
      </article>
    </SiteLayout>
  );
}
