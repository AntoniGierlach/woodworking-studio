import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "../contact-form";
import { SiteLayout } from "../site-chrome";
import ContactDetails from "./contact-details";
import JsonLd from "../json-ld";
import { breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Kontakt i wycena mebli na wymiar | Stolarnia Puszczawik",
  description:
    "Skontaktuj się ze Stolarnią Puszczawik w Jerzmanowicach. Opisz swój pomysł na mebel z drewna, a przygotujemy projekt dla klientów z Krakowa i Małopolski.",
  path: "/kontakt",
});

export default function ContactPage() {
  return (
    <SiteLayout innerPage>
      <JsonLd data={breadcrumbJsonLd([{ name: "Kontakt", path: "/kontakt" }])} />
      <section aria-labelledby="contact-page-title" className="inner-page contact-page">
        <div className="contact-page-grid page-width">
          <div className="contact-page-details">
            <Suspense fallback={<p className="contact-details-message">Wczytywanie danych kontaktowych…</p>}>
              <ContactDetails />
            </Suspense>
          </div>
          <div className="contact-form-panel">
            <p className="eyebrow">Formularz kontaktowy</p>
            <h1 id="contact-page-title">Opowiedz o swoim pomyśle</h1>
            <p>Opisz wymiary, przeznaczenie lub inspiracje. Możesz też dołączyć szkic albo zdjęcie.</p>
            <ContactForm />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
