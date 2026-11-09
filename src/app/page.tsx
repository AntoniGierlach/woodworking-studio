import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site-settings";
import workshopImage from "../../storage/workshop.jpg";
import workshopImage1 from "../../storage/workshop1.jpg";
import { SiteLayout } from "./site-chrome";
import ProjectShowcase from "./project-showcase";
import WoodShowcase from "./wood-showcase";

const services = [
  {
    number: "01",
    title: "Meble z dębu",
    description: "Wyrazisty rysunek słojów i ciepły, naturalny odcień.",
  },
  {
    number: "02",
    title: "Meble z orzecha",
    description: "Głębsza barwa i szlachetny charakter drewna.",
  },
  {
    number: "03",
    title: "Meble na wymiar",
    description: "Forma dopasowana do przestrzeni i wybranego gatunku.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const result = await getSiteSettings();
  if (result.status === "unavailable" || !result.settings) return {};
  return {
    title: result.settings.seo_title?.trim() || undefined,
    description: result.settings.seo_description?.trim() || undefined,
  };
}

export default function Home() {
  return (
    <SiteLayout>
      <section aria-labelledby="hero-title" className="hero page-width">
        <div className="hero-copy">
          <h1 id="hero-title">
            Meble z
            <br />
            <em>naturalnego</em>
            <br />
            drewna. Na lata.
          </h1>
          <p className="hero-description">
            Dąb, orzech i inne szlachetne gatunki staną się punktem wyjścia dla
            mebli tworzonych z myślą o Twojej przestrzeni.
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/oferta">
              Poznaj ofertę
            </Link>
            <Link className="button button-dark" href="/realizacje">
              Zobacz realizacje
            </Link>
          </div>
        </div>

        <figure className="hero-visual">
          <Image
            alt="Wnętrze drewnianej pracowni stolarskiej z narzędziami i stołami roboczymi"
            className="hero-image"
            fill
            priority
            sizes="(max-width: 540px) 100vw, 52vw"
            src={workshopImage}
          />
          <span aria-hidden="true" className="image-index">
            WARSZTAT / 01
          </span>
        </figure>
      </section>

      {/* <section aria-label="Kierunek pracowni" className="statement">
          <div className="statement-inner page-width">
            <p className="eyebrow">NATURALNY MATERIAŁ · UWAŻNY PROJEKT</p>
            <p>
              Dąb i orzech. Każdy z własnym
              <br />
              <em>charakterem i rysunkiem.</em>
            </p>
            <span aria-hidden="true" className="statement-mark">
              ✳
            </span>
          </div>
        </section> */}

      <section
        aria-labelledby="services-title"
        className="services section-space page-width"
        id="oferta"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">DĄB · ORZECH · INNE GATUNKI</p>
            <h2 id="services-title">
              Meble, w których
              <br />
              <em>materiał gra główną rolę.</em>
            </h2>
          </div>
          <p className="section-intro">
            Głównym kierunkiem warsztatu są meble z naturalnego drewna. Szczegóły
            oferty i dostępne gatunki uzupełnij zgodnie z planem pracowni.
          </p>
        </div>

        <div className="service-list">
          {services.map((service) => (
            <article className="service-item" key={service.number}>
              <span className="service-number">{service.number}</span>
              <div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="section-action">
          <Link className="button button-dark" href="/oferta">
            Zobacz pełną ofertę
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="projects-title"
        className="projects"
        id="realizacje"
      >
        <div className="projects-inner page-width">
          <div className="projects-heading">
            <div>
              <p className="eyebrow eyebrow-light">GALERIA REALIZACJI</p>
              <h2 id="projects-title">
                Projekty, które
                <br />
                <em>zostają na lata.</em>
              </h2>
            </div>
          </div>

          <Suspense fallback={<p className="project-carousel-loading">Ładowanie realizacji…</p>}>
            <ProjectShowcase />
          </Suspense>
        </div>
      </section>

      <section
        aria-labelledby="wood-guide-title"
        className="wood-guide"
        id="materialy"
      >
        <div className="wood-guide-inner page-width">
          <div className="wood-guide-heading">
            <div>
              <p className="eyebrow">WYBÓR MATERIAŁU</p>
              <h2 id="wood-guide-title">
                Każde drewno ma swój
                <br />
                <em>niepowtarzalny charakter.</em>
              </h2>
            </div>
            <p>
              Odpowiedni gatunek drewna nadaje meblom wyjątkowy wygląd i
              charakter. Od jasnego jesionu, przez klasyczny dąb i szlachetny
              orzech, aż po głęboko wybarwione gatunki egzotyczne - każde drewno
              wyróżnia się własną barwą, usłojeniem i strukturą.
            </p>
          </div>

          <Suspense fallback={<p className="wood-empty">Ładowanie gatunków drewna…</p>}>
            <WoodShowcase />
          </Suspense>
        </div>
      </section>

      <section
        aria-labelledby="about-title"
        className="about section-space page-width"
        id="o-pracowni"
      >
        <div className="about-visual">
          <Image
            alt="Detal drewnianego wnętrza — zdjęcie poglądowe"
            className="about-image"
            fill
            sizes="(max-width: 540px) 100vw, 42vw"
            src={workshopImage1}
          />
          <span aria-hidden="true" className="image-index">
            WARSZTAT / 02
          </span>
        </div>
        <div className="about-copy">
          <p className="eyebrow">KILKA SŁÓW O WARSZTACIE</p>
          <h2 id="about-title">
            Każdy gatunek
            <br />
            opowiada własną
            <br />
            <em>historię.</em>
          </h2>
          <p>
            Tworzymy z pasją, łącząc naturalne piękno drewna z rzemieślniczą
            precyzją. Każdy detal ma znaczenie, a każdy projekt powstaje z myślą
            o trwałości, funkcjonalności i ponadczasowym charakterze.
          </p>
        </div>
      </section>

      <section aria-labelledby="contact-title" className="contact" id="kontakt">
        <div className="contact-inner page-width">
          <div>
            <p className="eyebrow">NA DOBRY POCZĄTEK</p>
            <h2 id="contact-title">
              Masz pomysł?
              <br />
              <em>Skontaktuj się.</em>
            </h2>
          </div>
          <div className="contact-copy">
            <p>
              Masz pytanie o materiał, projekt lub sposób realizacji? Opowiedz o
              pomyśle w formularzu kontaktowym.
            </p>
            <Link className="button button-dark" href="/kontakt">
              Przejdź do formularza
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
