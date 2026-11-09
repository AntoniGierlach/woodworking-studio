import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { getSiteSettings } from "@/lib/site-settings";
import MobileNavigation from "./mobile-navigation";
import carpentryLogo from "../../storage/carpentry.png";

export const navigation = [
  { href: "/oferta", label: "Oferta" },
  { href: "/realizacje", label: "Realizacje" },
];

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
          <strong>Skibisztat</strong>
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

      <Link className="header-cta" href="/kontakt">
        Skontaktuj się
      </Link>

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
        <Suspense fallback={<span>Copyright © Skibisztat</span>}>
          <FooterContent />
        </Suspense>
        <Link href="/">Wróć na stronę główną</Link>
      </div>
    </footer>
  );
}

async function FooterContent() {
  const result = await getSiteSettings();
  const settings = result.status === "available" ? result.settings : null;
  return (
    <span className="footer-copy">
      <span>Copyright © {settings?.company_name?.trim() || "Skibisztat"} <Suspense fallback={null}><CopyrightYear /></Suspense></span>
      {settings?.footer_text?.trim() && <span>{settings.footer_text}</span>}
    </span>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-layout">
      <a className="skip-link" href="#main">
        Przejdź do treści
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
