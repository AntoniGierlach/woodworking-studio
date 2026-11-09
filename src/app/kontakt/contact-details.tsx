import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

export default async function ContactDetails() {
  const result = await getSiteSettings();
  if (result.status === "unavailable") {
    return <p className="contact-details-message" role="status">Dane kontaktowe są chwilowo niedostępne. Skorzystaj z formularza.</p>;
  }

  const settings = result.settings;
  const company = settings?.company_name?.trim();
  const phone = settings?.phone?.trim();
  const email = settings?.email?.trim();
  const address = settings?.address?.trim();
  const phoneLink = phone?.replace(/[^\d+]/g, "");
  const mapQuery = address ? encodeURIComponent(address) : "";

  return (
    <>
      <div className="contact-details">
        <p className="eyebrow">DANE WARSZTATU</p>
        {company && <h2>{company}</h2>}
        {!phone && !email && !address && (
          <p className="contact-details-message">Dane kontaktowe są w przygotowaniu. Napisz do nas przez formularz.</p>
        )}
        <dl>
          {phone && (
            <div>
              <Phone aria-hidden="true" size={19} />
              <div><dt>Telefon</dt><dd>{phoneLink && /\d/.test(phoneLink) ? <a href={`tel:${phoneLink}`}>{phone}</a> : phone}</dd></div>
            </div>
          )}
          {email && (
            <div>
              <Mail aria-hidden="true" size={19} />
              <div><dt>E-mail</dt><dd><a href={`mailto:${encodeURIComponent(email)}`}>{email}</a></dd></div>
            </div>
          )}
          {address && (
            <div>
              <MapPin aria-hidden="true" size={19} />
              <div><dt>Adres</dt><dd className="contact-address">{address}</dd></div>
            </div>
          )}
        </dl>
      </div>
      {address && (
        <div className="contact-map">
          <div className="contact-map-heading">
            <div><p className="eyebrow">LOKALIZACJA</p><h2>Znajdź nas</h2></div>
          </div>
          <iframe
            title={`Mapa Google: ${address}`}
            src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </>
  );
}
