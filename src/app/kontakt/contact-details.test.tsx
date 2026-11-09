import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/site-settings", () => ({ getSiteSettings: vi.fn() }));
vi.mock("../site-chrome", () => ({ SiteLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("../contact-form", () => ({ default: () => null }));

import { getSiteSettings } from "@/lib/site-settings";
import ContactDetails from "./contact-details";

const settings = {
  company_name: "Pracownia Dąb",
  phone: "+48 123 456 789",
  email: "kontakt@example.pl",
  address: "ul. Dębowa 1\n00-001 Warszawa",
  footer_text: null,
  seo_title: null,
  seo_description: null,
};

describe("dane kontaktowe", () => {
  beforeEach(() => vi.resetAllMocks());

  it("wyświetla zapisane dane i mapę z zakodowanym adresem", async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({ status: "available", settings });
    const html = renderToStaticMarkup(await ContactDetails());
    const address = encodeURIComponent(settings.address);
    expect(html).toContain("Pracownia Dąb");
    expect(html).toContain('href="tel:+48123456789"');
    expect(html).toContain('href="mailto:kontakt%40example.pl"');
    expect(html).toContain("ul. Dębowa 1");
    expect(html).toContain(`https://maps.google.com/maps?q=${address}&amp;output=embed`);
    expect(html).toContain(`https://www.google.com/maps/search/?api=1&amp;query=${address}`);
    expect(html).toContain('title="Mapa Google:');
  });

  it("nie pokazuje pustych danych ani mapy bez adresu", async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({ status: "available", settings: null });
    const html = renderToStaticMarkup(await ContactDetails());
    expect(html).toContain("Dane kontaktowe są w przygotowaniu");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("mailto:");
  });

  it("informuje o błędzie pobierania danych", async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({ status: "unavailable" });
    const html = renderToStaticMarkup(await ContactDetails());
    expect(html).toContain("Dane kontaktowe są chwilowo niedostępne");
    expect(html).toContain('role="status"');
  });
});
