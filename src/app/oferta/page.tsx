import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContentNotice from "../content-notice";
import OfferDescription from "../offer-description";
import OfferPrice from "../offer-price";
import OfferList from "./offer-list";
import {
  getContentAssetUrl,
  getContentCollection,
  getContentUnavailableNotice,
} from "@/lib/content-data";
import { SiteLayout } from "../site-chrome";

export const metadata: Metadata = {
  title: "Quercus Fagus | Oferta",
  description:
    "Poznaj możliwości projektowania mebli z naturalnego drewna. Szczegóły oferty uzupełnia warsztat.",
};

type Service = {
  id: string;
  title: string;
  slug: string;
  short_description?: string | null;
  content?: string | null;
  price?: string | null;
  image?: string | { id: string } | null;
  sort?: number;
};

export default async function OfferPage() {
  let services: Service[];
  try {
    services = await getContentCollection<Service>("services", {
      "filter[status][_eq]": "published",
      fields: "*,image.*",
      sort: "sort",
    });
  } catch {
    const notice = getContentUnavailableNotice();
    return (
      <SiteLayout innerPage>
        <section className="inner-page">
          <div className="inner-page-heading page-width">
            <h1>
              Meble, które możesz zabrać do
              <br />
              <em>swojego domu.</em>
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
    <SiteLayout innerPage>
      <section aria-labelledby="offer-title" className="inner-page">
        <div className="inner-page-heading page-width">
          <h1 id="offer-title">
            Meble, które możesz zabrać do
            <br />
            <em>swojego domu.</em>
          </h1>
          <p>
            W naszej ofercie znajdziesz gotowe meble wykonane z naturalnego
            drewna. Każdy z nich powstaje w warsztacie, z dbałością o dobór
            materiału, proporcje i wykończenie. Sprawdź aktualnie dostępne
            projekty i znajdź coś dla siebie.
          </p>
        </div>
        <OfferList>
          {services.length === 0 ? (
            <div className="content-notice offer-page-empty">
              <h2>Lista usług jest w przygotowaniu</h2>
              <p>
                Gdy warsztat opublikuje usługi, znajdziesz je w tym miejscu.
              </p>
              <Link className="button button-dark" href="/kontakt">
                Zapytaj o meble
              </Link>
            </div>
          ) : (
            services.map((service, index) => (
              <article className="service-item offer-item" key={service.id}>
                <span className="service-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="offer-item-content">
                  <h2>{service.title}</h2>
                  {service.image && (
                    <div className="offer-image-frame">
                      <Image
                        alt=""
                        className="offer-image"
                        fill
                        loading={index < 3 ? "eager" : "lazy"}
                        sizes="(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 33vw"
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
            ))
          )}
        </OfferList>
      </section>
    </SiteLayout>
  );
}
