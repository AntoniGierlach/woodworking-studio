import { Suspense, type ReactNode } from "react";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Phone } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";
import MobileNavigation from "./mobile-navigation";
import backgroundImage from "../../storage/background2-cloudflare.jpg";
import carpentryLogo from "../../storage/carpentry.png";

export const navigation = [
  { href: "/oferta", label: "Oferta" },
  { href: "/realizacje", label: "Realizacje" },
];

async function HeaderContactActions() {
  const result = await getSiteSettings();
  const phone = result.status === "available" ? result.settings?.phone?.trim() : "";
  const phoneLink = phone?.replace(/[^\d+]/g, "");

  return (
    <div className="header-contact-actions">
      {phone && (
        phoneLink && /\d/.test(phoneLink) ? (
          <a
            aria-label={`Zadzwoń: ${phone}`}
            className="header-phone"
            href={`tel:${phoneLink}`}
          >
            <Phone aria-hidden="true" size={17} />
            <span>{phone}</span>
          </a>
        ) : (
          <span className="header-phone">
            <Phone aria-hidden="true" size={17} />
            <span>{phone}</span>
          </span>
        )
      )}
      <Link className="header-cta" href="/kontakt">
        Kontakt
      </Link>
    </div>
  );
}

function HeaderContactActionsFallback() {
  return (
    <div className="header-contact-actions">
      <Link className="header-cta" href="/kontakt">
        Kontakt
      </Link>
    </div>
  );
}

function BrandMark() {
  return (
    <Image
      aria-hidden="true"
      className="brand-mark"
      alt=""
      height={42}
      src={carpentryLogo}
      width={42}
    />
  );
}

export function SiteHeader() {
  return (
    <header className="site-header" id="top">
      <Link className="brand" href="/">
        <BrandMark />
        <span className="brand-copy">
          <strong>Stolarnia Puszczawik</strong>
          <span>MEBLE NA WYMIAR</span>
        </span>
      </Link>

      <nav aria-label="Nawigacja główna" className="desktop-nav">
        {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
            {item.label}
            </Link>
        ))}
      </nav>

      <Suspense fallback={<HeaderContactActionsFallback />}>
        <HeaderContactActions />
      </Suspense>

      <MobileNavigation navigation={navigation} />
    </header>
  );
}

async function CopyrightYear() {
  await connection();
  return new Date().getFullYear();
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-bottom page-width">
        <Suspense fallback={<div className="footer-copy"><span>Copyright © Puszczawik</span></div>}>
          <FooterContent />
        </Suspense>
      </div>
    </footer>
  );
}

async function FooterContent() {
  const result = await getSiteSettings();
  const settings = result.status === "available" ? result.settings : null;
  const footerText = settings?.footer_text?.trim();
  return (
    <div className="footer-copy">
      <span>Copyright © {settings?.company_name?.trim() || "Puszczawik"} <Suspense fallback={null}><CopyrightYear /></Suspense></span>
      {footerText && <span>{footerText}</span>}
    </div>
  );
}

export function SiteLayout({
  children,
  innerPage = false,
  repeatBackground = false,
}: {
  children: ReactNode;
  innerPage?: boolean;
  repeatBackground?: boolean;
}) {
  const repeatedBackgroundSrc = repeatBackground
    ? getImageProps({
        alt: "",
        height: Math.round(960 * backgroundImage.height / backgroundImage.width),
        quality: 75,
        src: backgroundImage,
        width: 960,
      }).props.src
    : undefined;

  return (
    <div className="site-layout">
      <a className="skip-link" href="#main">
        Przejdź do treści
      </a>
      <SiteHeader />
      <main
        className={innerPage ? "site-main site-main-inner" : "site-main"}
        id="main"
        tabIndex={-1}
      >
        {innerPage && (
          <div
            aria-hidden="true"
            className={
              repeatBackground
                ? "site-background site-background-repeating"
                : "site-background"
            }
            style={
              repeatedBackgroundSrc
                ? { backgroundImage: `url("${repeatedBackgroundSrc}")` }
                : undefined
            }
          >
            {!repeatBackground && (
              <Image
                alt=""
                fill
                fetchPriority="low"
                loading="lazy"
                sizes="100vw"
                src={backgroundImage}
              />
            )}
          </div>
        )}
        {innerPage ? (
          <div className="inner-page-surface">{children}</div>
        ) : (
          children
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
