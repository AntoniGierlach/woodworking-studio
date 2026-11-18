import type { MetadataRoute } from "next";
import { getContentCollection } from "@/lib/content-data";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type ProjectEntry = {
  slug: string;
  date_created?: string | null;
  date_updated?: string | null;
};

function toDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2} \d/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/oferta"), changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/realizacje"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/kontakt"), changeFrequency: "yearly", priority: 0.7 },
  ];

  try {
    const projects = await getContentCollection<ProjectEntry>("projects");
    let newest: Date | undefined;

    for (const project of projects) {
      if (!project.slug) continue;
      const lastModified =
        toDate(project.date_updated) ?? toDate(project.date_created);
      if (lastModified && (!newest || lastModified > newest)) newest = lastModified;
      entries.push({
        url: absoluteUrl(`/realizacje/${encodeURIComponent(project.slug)}`),
        lastModified,
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }

    if (newest) {
      const listing = entries.find((e) => e.url === absoluteUrl("/realizacje"));
      if (listing) listing.lastModified = newest;
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "sitemap_projects_read_failed",
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
  }

  return entries;
}
