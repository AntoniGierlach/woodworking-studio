import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentNotice from "../../content-notice";
import {
  getContentAssetUrl,
  getContentCollection,
  getContentUnavailableNotice,
} from "@/lib/content-data";
import { SiteLayout } from "../../site-chrome";
import ProjectImageViewer from "./project-image-viewer";

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
  params: Promise<{ slug: string}>;
};

export async function generateMetadata({
}: ProjectPageProps): Promise<Metadata> {
  return {
    title: `Puszczawik | Realizacja`,
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
      <SiteLayout innerPage>
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
    <SiteLayout innerPage>
      <article aria-labelledby="project-title" className="inner-page">
        <div className="inner-page-heading page-width">
          <Link className="button button-dark" href="/realizacje">
            Wróć do realizacji
          </Link>
          <h1 id="project-title">{project.title}</h1>
          {project.short_description && (
            <p>{project.short_description}</p>
          )}
        </div>
        <ProjectImageViewer
          title={project.title}
          cover={project.cover_image ? {
            alt: `${project.title} - zdjęcie realizacji`,
            src: getContentAssetUrl(
              typeof project.cover_image === "string"
                ? project.cover_image
                : project.cover_image.id,
            ),
          } : null}
          images={(project.project_images ?? []).map((image) => ({
            alt: image.alt?.trim() || project.title,
            src: getContentAssetUrl(
              typeof image.file === "string" ? image.file : image.file.id,
            ),
          }))}
        />
        {project.description && (
          <div className="page-width project-detail-copy">
            <p>{project.description}</p>
          </div>
        )}
        <div className="page-width studio-callout">
          <p className="eyebrow">PODOBNY PROJEKT?</p>
          <h2>Porozmawiajmy o meblu dopasowanym do Twojej przestrzeni.</h2>
          <Link className="button button-dark" href="/kontakt">
            Skontaktuj się  
          </Link>
        </div>
      </article>
    </SiteLayout>
  );
}
