"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ProjectPhoto = {
  src: string;
  alt: string;
};

export default function ProjectImageViewer({
  title,
  cover,
  description,
  images,
}: {
  title: string;
  cover?: ProjectPhoto | null;
  description?: string | null;
  images: ProjectPhoto[];
}) {
  const [activePhoto, setActivePhoto] = useState<ProjectPhoto | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activePhoto && !dialog.open) dialog.showModal();
    if (!activePhoto && dialog.open) dialog.close();
  }, [activePhoto]);

  function renderPhoto(photo: ProjectPhoto, variant: "cover" | "gallery", index: number) {
    return (
      <figure className={variant === "cover" ? "project-detail-cover" : undefined} key={`${photo.src}-${index}`}>
        <button
          aria-label={`Powiększ zdjęcie: ${photo.alt}`}
          className="project-image-trigger"
          onClick={() => setActivePhoto(photo)}
          type="button"
        >
          <Image
            alt={photo.alt}
            fill
            priority={variant === "cover"}
            sizes={variant === "cover" ? "(max-width: 760px) 100vw, 90vw" : "(max-width: 760px) 100vw, 50vw"}
            src={photo.src}
          />
        </button>
      </figure>
    );
  }

  return (
    <>
      {cover && (
        <div className="page-width">
          {renderPhoto(cover, "cover", 0)}
        </div>
      )}
      {description && (
        <div className="page-width project-detail-copy">
          <p>{description}</p>
        </div>
      )}
      {images.length > 0 && (
        <div
          aria-label={`Galeria realizacji: ${title}`}
          className="page-width project-detail-gallery"
        >
          {images.map((photo, index) => renderPhoto(photo, "gallery", index + 1))}
        </div>
      )}
      <dialog
        aria-label="Podgląd zdjęcia"
        className="project-image-dialog"
        onClose={() => setActivePhoto(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setActivePhoto(null);
        }}
        ref={dialogRef}
      >
        {activePhoto && (
          <>
            <button
              aria-label="Zamknij podgląd zdjęcia"
              className="project-image-dialog-close"
              onClick={() => setActivePhoto(null)}
              type="button"
            >
              <X aria-hidden="true" size={20} />
              <span>Zamknij</span>
            </button>
            <div className="project-image-dialog-visual">
              <Image
                alt={activePhoto.alt}
                fill
                sizes="100vw"
                src={activePhoto.src}
              />
            </div>
          </>
        )}
      </dialog>
    </>
  );
}