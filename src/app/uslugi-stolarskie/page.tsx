import type { Metadata } from "next";
import Link from "next/link";
import ContentNotice from "../content-notice";
import OfferPrice from "../offer-price";
import { SiteLayout } from "../site-chrome";
import {
  getCarpentryServices,
  getContentUnavailableNotice,
} from "@/lib/content-data";

export const metadata: Metadata = {
  title: "Quercus Fagus | Usługi stolarskie",
  description:
    "Poznaj usługi stolarskie wykonywane z naturalnego drewna i zapytaj o realizację swojego pomysłu.",
};

export default async function CarpentryServicesPage() {
  const result = await getCarpentryServices();
  const unavailableNotice = getContentUnavailableNotice();

  return (
    <SiteLayout innerPage>
      <section
        aria-labelledby="carpentry-services-title"
        className="inner-page carpentry-services-page"
      >
        <div className="inner-page-heading page-width">
          <h1 id="carpentry-services-title">
            Usługi <em>stolarskie.</em>
          </h1>
          <p>
            Od pierwszego pomysłu po staranne wykończenie — tworzymy drewniane
            elementy i meble, które pasują do Twojej przestrzeni i codziennych
            potrzeb. Opisz nam swój projekt, a wspólnie dobierzemy rozwiązanie.
          </p>
        </div>

        {result.status === "unavailable" ? (
          <div className="page-width">
            <ContentNotice title={unavailableNotice.title}>
              {unavailableNotice.message}
            </ContentNotice>
          </div>
        ) : result.services.length === 0 ? (
          <div className="carpentry-services-empty content-notice page-width">
            <h2>Przygotowujemy listę usług.</h2>
            <p>
              Jeśli masz już pomysł na mebel lub drewniany element wnętrza,
              napisz do nas — porozmawiamy o możliwościach wykonania.
            </p>
            <Link className="button button-dark" href="/kontakt">
              Opowiedz o swoim projekcie
            </Link>
          </div>
        ) : (
          <>
            <div className="carpentry-services-grid page-width">
              {result.services.map((service, index) => (
                <article className="carpentry-service-card" key={service.id}>
                  <div className="carpentry-service-card-heading">
                    <span className="carpentry-service-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h2>{service.title}</h2>
                  <p>{service.description}</p>
                  <div className="carpentry-service-card-footer">
                    {service.price?.trim() ? (
                      <OfferPrice price={service.price} />
                    ) : (
                      <p className="carpentry-service-quote">
                        <span>Cena</span>
                        <strong>Wycena indywidualna</strong>
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}