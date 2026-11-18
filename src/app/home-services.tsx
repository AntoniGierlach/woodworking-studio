import { connection } from "next/server";
import Image from "next/image";
import { Images } from "lucide-react";
import { getContentAssetUrl, getContentCollection } from "@/lib/content-data";
import OfferDescription from "./offer-description";
import OfferPrice from "./offer-price";

type OfferItem = {
  id: string;
  title: string;
  short_description?: string | null;
  content?: string | null;
  price?: string | null;
  image?: string | { id: string } | null;
};

export default async function HomeServices() {
  await connection();
  let services: OfferItem[];
  try {
    services = await getContentCollection<OfferItem>("services");
  } catch {
    return (
      <p className="service-list-notice" role="status">
        Oferta jest chwilowo niedostępna. Spróbuj ponownie później.
      </p>
    );
  }

  if (services.length === 0) {
    return (
      <div className="offer-empty">
        <Images aria-hidden="true" className="empty-index" size={34} />
        <div>
          <p className="empty-title">Oferta w przygotowaniu.</p>
          <p>Zapraszamy wkrótce do naszego warsztatu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="service-list">
      {services.map((service, index) => (
        <article className="service-item offer-item home-offer-item" key={service.id}>
          <span className="service-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3>{service.title}</h3>
            {service.image && (
              <div className="offer-image-frame">
                <Image
                  alt={service.title}
                  className="offer-image"
                  fill
                  sizes="(max-width: 760px) 100vw, 33vw"
                  src={getContentAssetUrl(
                    typeof service.image === "string"
                      ? service.image
                      : service.image.id,
                  )}
                />
              </div>
            )}
            <OfferDescription
              shortDescription={service.short_description}
              content={service.content}
            />
          </div>
          <div className="offer-item-footer">
            <OfferPrice price={service.price} />
          </div>
        </article>
      ))}
    </div>
  );
}