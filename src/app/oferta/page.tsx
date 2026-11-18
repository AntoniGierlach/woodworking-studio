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
import JsonLd from "../json-ld";
import { breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Meble na zamówienie z naturalnego drewna | Puszczawik",
  description:
    "Meble drewniane na zamówienie i indywidualne projekty stolarskie. Sprawdź, co wykonujemy w naszym warsztacie, i zapytaj o realizację w Krakowie lub Małopolsce.",
  path: "/oferta",
});

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
              Czym się
              <br />
              <em>zajmujemy?</em>
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
      <JsonLd data={breadcrumbJsonLd([{ name: "Oferta", path: "/oferta" }])} />
      <section aria-labelledby="offer-title" className="inner-page">
        <div className="inner-page-heading page-width">
          <h1 id="offer-title">
            Czym się
            <br />
            <em>zajmujemy?</em>
          </h1>
          <p>
            Oferujemy kompleksowe usługi stolarskie, łącząc tradycyjne rzemiosło
            z precyzją nowoczesnej obróbki drewna. Realizujemy indywidualne
            projekty mebli na wymiar, a także prace związane z przygotowaniem i
            obróbką materiału.
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
                        alt={service.title}
                        className="offer-image"
                        fill
                        fetchPriority={index === 0 ? "high" : "auto"}
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
