import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import ContentNotice from "../../content-notice";
import {
  getContentAssetUrl,
  getContentCollection,
  getContentUnavailableNotice,
} from "@/lib/content-data";
import { SiteLayout } from "../../site-chrome";
import ProjectImageViewer from "./project-image-viewer";
import JsonLd from "../../json-ld";
import {
  NOINDEX_METADATA,
  breadcrumbJsonLd,
  buildPageMetadata,
  truncateDescription,
} from "@/lib/seo";

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

// Jedno zapytanie na żądanie: korzystają z niego zarówno generateMetadata, jak i strona.
const getProject = cache(async (slug: string) => {
  const projects = await getContentCollection<Project>("projects", {
    "filter[slug][_eq]": slug,
    "filter[status][_eq]": "published",
    fields: "*,cover_image.*,project_images.*,project_images.file.*",
    "deep[project_images][_sort]": "sort",
    limit: "1",
  });
  return projects[0];
});

function assetId(reference: AssetReference): string {
  return typeof reference === "string" ? reference : reference.id;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  let project: Project | undefined;
  try {
    project = await getProject(slug);
  } catch {
    return NOINDEX_METADATA;
  }
  if (!project) return NOINDEX_METADATA;

  const description = truncateDescription(
    project.short_description?.trim() ||
      project.description?.trim() ||
      `${project.title} – indywidualna realizacja wykonana w pracowni stolarskiej Puszczawik.`,
  );
  const imageRef = project.cover_image ?? project.project_images?.[0]?.file;

  return buildPageMetadata({
    title: `${project.title} – indywidualna realizacja | Puszczawik`,
    description,
    path: `/realizacje/${encodeURIComponent(project.slug)}`,
    image: imageRef
      ? {
          url: getContentAssetUrl(assetId(imageRef)),
          alt: `${project.title} - zdjęcie realizacji`,
        }
      : undefined,
  });
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  let project: Project | undefined;
  try {
    project = await getProject(slug);
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
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Realizacje", path: "/realizacje" },
          {
            name: project.title,
            path: `/realizacje/${encodeURIComponent(project.slug)}`,
          },
        ])}
      />
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
          description={project.description}
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
