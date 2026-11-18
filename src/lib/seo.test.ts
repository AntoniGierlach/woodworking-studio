import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  localBusinessJsonLd,
  truncateDescription,
} from "./seo";
import { serializeJsonLd } from "../app/json-ld";

describe("SEO helpers", () => {
  it("builds canonical, Open Graph, and Twitter metadata from a canonical path", () => {
    const metadata = buildPageMetadata({
      title: "Meble na wymiar",
      description: "Meble z naturalnego drewna.",
      path: "/oferta",
    });

    expect(absoluteUrl("oferta")).toBe("https://www.puszczawik.com/oferta");
    expect(metadata.alternates?.canonical).toBe("https://www.puszczawik.com/oferta");
    expect(metadata.openGraph).toMatchObject({
      title: "Meble na wymiar",
      url: "https://www.puszczawik.com/oferta",
      siteName: "Stolarnia Puszczawik",
    });
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });

  it("limits descriptions and keeps verified physical and service locations distinct", () => {
    expect(truncateDescription("Krótki opis")).toBe("Krótki opis");
    expect(truncateDescription("słowo ".repeat(40)).length).toBeLessThanOrEqual(160);
    expect(localBusinessJsonLd()).toMatchObject({
      "@type": "LocalBusiness",
      telephone: "+48575852555",
      address: { addressLocality: "Jerzmanowice" },
      areaServed: [{ name: "Kraków" }, { name: "województwo małopolskie" }],
    });
  });

  it("creates absolute breadcrumbs and safely escapes script-breaking content", () => {
    const breadcrumbs = breadcrumbJsonLd([{ name: "<Oferta>", path: "/oferta" }]);
    expect(breadcrumbs.itemListElement[1].item).toBe("https://www.puszczawik.com/oferta");
    expect(serializeJsonLd({ title: "</script>\u2028" })).toBe(
      '{"title":"\\u003c/script>\\u2028"}',
    );
  });
});