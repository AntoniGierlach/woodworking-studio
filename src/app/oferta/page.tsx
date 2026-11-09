import type { Metadata } from "next";
import { getImageProps } from "next/image";
import Link from "next/link";
import ContentNotice from "../content-notice";
import OfferDescription from "../offer-description";
import OfferList from "./offer-list";
import {
  getContentAssetUrl,
  getContentCollection,
  getContentUnavailableNotice,
} from "@/lib/content-data";
import { SiteLayout } from "../site-chrome";

export const metadata: Metadata = {
  title: "Oferta | Meble z naturalnego drewna",
  description:
    "Poznaj możliwości projektowania mebli z naturalnego drewna. Szczegóły oferty uzupełnia warsztat.",
};

export const instant = false;

type Service = {
  id: string;
  title: string;
  slug: string;
  short_description?: string | null;
  content?: string | null;
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
      <SiteLayout>
        <section className="inner-page">
          <div className="inner-page-heading page-width">
            <p className="eyebrow">MOŻLIWOŚCI PRACOWNI</p>
            <h1>
              Meble z naturalnego
              <br />
              <em>drewna.</em>
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
    <SiteLayout>
      <section aria-labelledby="offer-title" className="inner-page">
        <div className="inner-page-heading page-width">
          <p className="eyebrow">MOŻLIWOŚCI PRACOWNI</p>
          <h1 id="offer-title">
            Meble z naturalnego
            <br />
            <em>drewna.</em>
          </h1>
          <p>
            Każdy projekt zaczyna się od rozmowy o przestrzeni, potrzebach i
            materiale. Dostępne usługi są publikowane przez pracownię.
          </p>
        </div>
        <OfferList count={services.length}>
          {services.length === 0 ? (
            <div className="content-notice offer-empty">
              <p className="eyebrow">OFERTA</p>
              <h2>Lista usług jest w przygotowaniu</h2>
              <p>
                Gdy warsztat opublikuje usługi, znajdziesz je w tym
                miejscu.
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
                <div>
                  <h2>{service.title}</h2>
                  {service.image && (
                    // The image's natural aspect ratio is unknown until it loads.
                    // getImageProps retains Next.js optimization without a fixed-ratio warning.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img {...getImageProps({
                      alt: "",
                      className: "offer-image",
                      height: 240,
                      loading: index < 3 ? "eager" : "lazy",
                      sizes: "(max-width: 760px) 100vw, 40vw",
                      src: getContentAssetUrl(
                        typeof service.image === "string"
                          ? service.image
                          : service.image.id,
                      ),
                      width: 360,
                    }).props} alt="" />
                  )}
                  <OfferDescription shortDescription={service.short_description} content={service.content} />
                </div>
              </article>
            ))
          )}
        </OfferList>
      </section>
    </SiteLayout>
  );
}
