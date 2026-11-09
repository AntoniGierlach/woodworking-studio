import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "../contact-form";
import { SiteLayout } from "../site-chrome";
import ContactDetails from "./contact-details";

export const metadata: Metadata = {
  title: "Kontakt | Meble z naturalnego drewna",
  description:
    "Opowiedz o swoim pomyśle na mebel z naturalnego drewna. Wyślij zapytanie do pracowni.",
};

export default function ContactPage() {
  return (
    <SiteLayout>
      <section aria-labelledby="contact-page-title" className="inner-page contact-page">
        <div className="contact-page-grid page-width">
          <div className="contact-page-details">
            <Suspense fallback={<p className="contact-details-message">Wczytywanie danych kontaktowych…</p>}>
              <ContactDetails />
            </Suspense>
          </div>
          <div className="contact-form-panel">
            <p className="eyebrow">TWOJE ZAPYTANIE</p>
            <h2>Opowiedz o swoim pomyśle</h2>
            <p>Opisz wymiary, przeznaczenie lub inspiracje. Możesz też dołączyć szkic albo zdjęcie.</p>
            <ContactForm />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
