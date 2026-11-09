import Link from "next/link";
import { connection } from "next/server";
import { Images, ImageOff } from "lucide-react";
import { getContentAssetUrl, getProjectPreviews } from "@/lib/content-data";
import ProjectCarousel from "./project-carousel";

export default async function ProjectShowcase() {
  await connection();

  let projects;
  try {
    projects = await getProjectPreviews();
  } catch {
    return (
      <div className="projects-empty">
        <ImageOff aria-hidden="true" className="empty-index" size={34} />
        <div>
          <p className="empty-title">Realizacje są chwilowo niedostępne</p>
          <p>Nie udało się pobrać projektów. Spróbuj ponownie później.</p>
        </div>
        <Link href="/realizacje">Zobacz realizacje</Link>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="projects-empty">
        <Images aria-hidden="true" className="empty-index" size={34} />
        <div>
          <p className="empty-title">Pierwsze realizacje pojawią się tutaj</p>
          <p>Zapraszamy wkrótce do galerii projektów pracowni.</p>
        </div>
        <Link href="/realizacje">Zobacz realizacje</Link>
      </div>
    );
  }

  return (
    <ProjectCarousel
      projects={projects.map((project) => ({
        id: project.id,
        title: project.title,
        slug: project.slug,
        imageUrl: project.cover_image ? getContentAssetUrl(project.cover_image) : null,
      }))}
    />
  );
}
