import type { Metadata } from "next";
import defaultShareImage from "../../storage/workshop.jpg";
import carpentryLogo from "../../storage/carpentry.png";

export const SITE_URL = "https://www.puszczawik.com";
export const SITE_NAME = "Stolarnia Puszczawik";

export const BUSINESS = {
  name: SITE_NAME,
  telephone: "+48575852555",
  email: "fgierlach07@gmail.com",
  address: {
    streetAddress: "Graniczna 73",
    postalCode: "32-048",
    addressLocality: "Jerzmanowice",
    addressCountry: "PL",
  },
} as const;

export const HOME_TITLE = "Meble na wymiar Kraków | Stolarnia Puszczawik";
export const HOME_DESCRIPTION =
  "Tworzymy meble na wymiar z naturalnego drewna. Indywidualne projekty, staranne wykonanie i realizacje w Krakowie oraz województwie małopolskim.";

export function absoluteUrl(path: string = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncateDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

export type PageMetadata = Metadata & {
  twitter: {
    card: "summary_large_image";
    title: string;
    description?: string;
    images: string[];
  };
};

type PageMetadataInput = {
  title: string;
  description?: string;
  path: string;
  image?: { url: string; alt?: string; width?: number; height?: number };
  noindex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  noindex = false,
}: PageMetadataInput): PageMetadata {
  const url = absoluteUrl(path);
  const shareImage = image ?? {
    url: defaultShareImage.src,
    width: defaultShareImage.width,
    height: defaultShareImage.height,
    alt: "Pracownia stolarska Puszczawik",
  };
  const images = [
    {
      url: absoluteUrl(shareImage.url),
      alt: shareImage.alt,
      width: shareImage.width,
      height: shareImage.height,
    },
  ];

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "pl_PL",
      siteName: SITE_NAME,
      title,
      description,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((item) => item.url),
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: BUSINESS.name,
    url: `${SITE_URL}/`,
    description: HOME_DESCRIPTION,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    logo: absoluteUrl(carpentryLogo.src),
    image: absoluteUrl(defaultShareImage.src),
    address: { "@type": "PostalAddress", ...BUSINESS.address },
    areaServed: [
      { "@type": "City", name: "Kraków" },
      { "@type": "AdministrativeArea", name: "województwo małopolskie" },
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "Warsztat Stolarski Puszczawik",
    alternateName: "Puszczawik",
    url: `${SITE_URL}/`,
  };
}

export type Crumb = { name: string; path: string };
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  const items: Crumb[] = [{ name: "Strona główna", path: "/" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}