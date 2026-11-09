import "server-only";

import { query } from "./db";

export interface MediaReference {
  id: string;
}

export interface Service {
  id: string;
  title: string;
  slug: string;
  short_description?: string | null;
  content?: string | null;
  image?: string | MediaReference | null;
  sort?: number | null;
  status: string;
}

export interface ProjectImage {
  id: string;
  file: string | MediaReference;
  alt?: string | null;
  sort?: number | null;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  short_description?: string | null;
  description?: string | null;
  cover_image?: string | MediaReference | null;
  project_images?: ProjectImage[] | null;
  sort?: number | null;
  status: string;
  date_created?: string | null;
}

export interface ProjectPreview {
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
}

export interface WoodType {
  id: string;
  title: string;
  tone: string;
  grain: string;
  character: string;
  image_id: string | null;
}

export async function getWoodTypes(): Promise<WoodType[]> {
  const result = await query<WoodType>(
    `SELECT id, title, tone, grain, character, image_id
     FROM app_wood_types WHERE status = 'published'
     ORDER BY sort ASC, date_created DESC, id ASC LIMIT 100`,
  );
  return result.rows;
}

export async function getProjectPreviews(): Promise<ProjectPreview[]> {
  const result = await query(
    `SELECT id, title, slug, cover_image_id AS cover_image
     FROM app_projects WHERE status = 'published'
     ORDER BY sort, date_created DESC, id ASC LIMIT 100`,
  );
  return result.rows as ProjectPreview[];
}

export function getContentUnavailableNotice() {
  return {
    title: "Treści są chwilowo niedostępne",
    message: "Nie udało się pobrać treści. Spróbuj ponownie później.",
  };
}

export function getContentAssetUrl(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("Nieprawidłowy identyfikator zdjęcia.");
  }
  return `/api/media/${encodeURIComponent(id)}`;
}

export async function getContentCollection<T>(
  collection: "services" | "projects",
  filters: Record<string, string> = {},
): Promise<T[]> {
  const slug = Object.entries(filters).find(([key]) =>
    key.startsWith("filter[slug]"),
  )?.[1];
  const limitValue = Number(filters.limit ?? "100");
  const limit = Number.isInteger(limitValue)
    ? Math.max(1, Math.min(100, limitValue))
    : 100;

  if (collection === "services") {
    const result = slug
      ? await query(
          `SELECT id, title, slug, short_description, content, image_id AS image,
                  sort, status, date_created
           FROM app_services WHERE status = 'published' AND slug = $1
           ORDER BY sort ASC, date_created DESC, id ASC LIMIT $2`,
          [slug, limit],
        )
      : await query(
          `SELECT id, title, slug, short_description, content, image_id AS image,
                  sort, status, date_created
           FROM app_services WHERE status = 'published'
           ORDER BY sort ASC, date_created DESC, id ASC LIMIT $1`,
          [limit],
        );
    return result.rows as T[];
  }

  if (collection === "projects") {
    const base = `SELECT p.id, p.title, p.slug, p.category, p.short_description,
                         p.description, p.cover_image_id AS cover_image, p.sort,
                         p.status, p.date_created,
                         COALESCE((
                           SELECT json_agg(json_build_object(
                             'id', pi.id,
                             'file', pi.media_id,
                             'alt', pi.alt,
                             'sort', pi.sort
                           ) ORDER BY pi.sort)
                           FROM app_project_images pi WHERE pi.project_id = p.id
                         ), '[]') AS project_images
                  FROM app_projects p WHERE p.status = 'published'`;
    const result = slug
      ? await query(
          `${base} AND p.slug = $1 ORDER BY p.sort, p.date_created DESC, p.id ASC LIMIT $2`,
          [slug, limit],
        )
      : await query(
          `${base} ORDER BY p.sort, p.date_created DESC, p.id ASC LIMIT $1`,
          [limit],
        );
    return result.rows as T[];
  }

  throw new Error("Unsupported public content collection.");
}
