import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site-settings";
import { HOME_DESCRIPTION, HOME_TITLE, buildPageMetadata, localBusinessJsonLd } from "@/lib/seo";
import JsonLd from "./json-ld";
import backgroundImage from "../../storage/background2-cloudflare.jpg";
import workshopImage from "../../storage/workshop.jpg";
import workshopImage1 from "../../storage/workshop1.jpg";
import { SiteLayout } from "./site-chrome";
import HomeServices from "./home-services";
import ProjectShowcase from "./project-showcase";
import WoodShowcase from "./wood-showcase";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getSiteSettings();
  const settings = result.status === "available" ? result.settings : null;
  return buildPageMetadata({
    title: settings?.seo_title?.trim() || HOME_TITLE,
    description: settings?.seo_description?.trim() || HOME_DESCRIPTION,
    path: "/",
  });
}

export default async function Home() {
  return (
    <SiteLayout>
      <JsonLd data={localBusinessJsonLd()} />
      <section aria-labelledby="hero-title" className="hero">
        <div aria-hidden="true" className="hero-background">
          <Image
            alt=""
            fill
            fetchPriority="low"
            loading="lazy"
            sizes="100vw"
            src={backgroundImage}
          />
        </div>

        <div className="hero-inner page-width">
          <div className="hero-copy">
            <h1 id="hero-title">
              Meble z
              <br />
              <em>naturalnego drewna</em>
            </h1>
            <p className="hero-description">
              Tworzymy meble z naturalnego drewna, dopasowane do wnętrza,
              potrzeb i pomysłów naszych klientów. Pracujemy z dębem, jesionem i
              innymi szlachetnymi gatunkami, dbając o to, by każdy projekt miał
              swój własny charakter.
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
        </div>
      </section>
      <section
        aria-labelledby="services-title"
        className="services section-space page-width"
        id="oferta"
      >
        <div className="section-heading">
          <div>
            <h2 id="services-title">
              Co możemy dla
              <br />
              <em>Ciebie</em> zrobić?
            </h2>
          </div>
          <p className="section-intro">
            Każdy projekt zaczyna się od pomysłu i wyboru odpowiedniego
            materiału. Wykonujemy meble z naturalnego drewna, zarówno według
            własnych koncepcji, jak i indywidualnych oczekiwań klientów.
          </p>
        </div>

        <Suspense
          fallback={
            <p className="service-list-notice" role="status">
              Ładowanie oferty…
            </p>
          }
        >
          <HomeServices />
        </Suspense>
      </section>

      <section
        aria-labelledby="projects-title"
        className="projects"
        id="realizacje"
      >
        <div className="projects-inner page-width">
          <div className="projects-heading">
            <div>
              <h2 id="projects-title">
                Zobacz, co powstaje w
                <br />
                <em>naszym warsztacie.</em>
              </h2>
            </div>
          </div>

          <Suspense
            fallback={
              <p className="project-carousel-loading">Ładowanie realizacji…</p>
            }
          >
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
              <h2 id="wood-guide-title">
                Nie każde drewno <em>wygląda i zachowuje</em>
                <br />
                się tak samo.
              </h2>
            </div>
          </div>

          <Suspense
            fallback={<p className="wood-empty">Ładowanie gatunków drewna…</p>}
          >
            <WoodShowcase />
          </Suspense>
        </div>
      </section>

      <section
        aria-labelledby="about-title"
        className="about-section"
        id="o-pracowni"
      >
        <div aria-hidden="true" className="about-background">
          <Image
            alt=""
            fill
            fetchPriority="low"
            loading="lazy"
            sizes="100vw"
            src={backgroundImage}
          />
        </div>
        <div className="about section-space page-width">
          <div className="about-visual">
            <Image
              alt="Detal drewnianego wnętrza - zdjęcie poglądowe"
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
            <h2 id="about-title">
              Najpierw jest pomysł.
              <br />
              <em>Później praca w drewnie.</em>
            </h2>
            <p>
              W naszym warsztacie drewno nie jest tylko materiałem do wykonania
              mebla. To od niego zaczynamy planowanie każdego projektu.
              Przyglądamy się jego kolorowi, usłojeniu i właściwościom, a
              następnie dobieramy odpowiednią formę i sposób wykonania.
            </p>
            <p>
              Lubimy pracę z naturalnym materiałem, bo każdy kawałek jest trochę
              inny. To właśnie sprawia, że gotowe meble nie są identycznymi
              produktami z katalogu.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="contact-title" className="contact" id="kontakt">
        <div className="contact-inner page-width">
          <div>
            <h2 id="contact-title">
              Masz pomysł?
              <br />
              <em>Skontaktuj się.</em>
            </h2>
          </div>
          <div className="contact-copy">
            <p>
              Może masz już gotowy projekt, a może dopiero zastanawiasz się,
              jakie drewno wybrać i od czego zacząć. Napisz nam, czego
              potrzebujesz. Chętnie poznamy Twój pomysł i porozmawiamy o
              możliwościach jego realizacji.
            </p>
            <p>
              Nasz warsztat znajduje się w Jerzmanowicach. Meble na wymiar
              wykonujemy dla klientów z Krakowa i całej Małopolski.
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
