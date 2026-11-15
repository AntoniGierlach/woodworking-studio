import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";
import ContactEmailCopy from "./contact-email-copy";

export default async function ContactDetails() {
  const result = await getSiteSettings();
  if (result.status === "unavailable") {
    return (
      <p className="contact-details-message" role="status">
        Dane kontaktowe są chwilowo niedostępne. Skorzystaj z formularza.
      </p>
    );
  }

  const settings = result.settings;
  const company = settings?.company_name?.trim();
  const phone = settings?.phone?.trim();
  const email = settings?.email?.trim();
  const address = settings?.address?.trim();
  const openingHours = settings?.opening_hours?.trim();
  const phoneLink = phone?.replace(/[^\d+]/g, "");
  const mapQuery = address ? encodeURIComponent(address) : "";

  return (
    <>
      <div className="contact-details">
        <p className="eyebrow">DANE WARSZTATU</p>
        {company && <h2>{company}</h2>}
        {!phone && !email && !openingHours && (
          <p className="contact-details-message">
            Dane kontaktowe są w przygotowaniu. Napisz do nas przez formularz.
          </p>
        )}
        <dl className="contact-details-list">
          {phone && (
            <div>
              <Phone aria-hidden="true" size={19} />
              <div>
                <dt>Telefon</dt>
                <dd>
                  {phoneLink && /\d/.test(phoneLink) ? (
                    <a href={`tel:${phoneLink}`}>{phone}</a>
                  ) : (
                    phone
                  )}
                </dd>
              </div>
            </div>
          )}
          {email && (
            <div>
              <Mail aria-hidden="true" size={19} />
              <div>
                <dt>E-mail</dt>
                <dd>
                  <ContactEmailCopy email={email} />
                </dd>
              </div>
            </div>
          )}
          {openingHours && (
            <div>
              <Clock aria-hidden="true" size={19} />
              <div>
                <dt>Godziny otwarcia</dt>
                <dd className="contact-opening-hours">
                  {openingHours
                    .split(/\r?\n/)
                    .filter((line) => line.trim())
                    .map((line, index) => {
                      const separator = line.indexOf(":");
                      const day =
                        separator >= 0 ? line.slice(0, separator).trim() : "";
                      const hours =
                        separator >= 0
                          ? line.slice(separator + 1).trim()
                          : line.trim();

                      return (
                        <div
                          className="contact-opening-hours-row"
                          key={`${index}-${line}`}
                        >
                          <span>{day}</span>
                          <span>{hours}</span>
                        </div>
                      );
                    })}
                </dd>
              </div>
            </div>
          )}
        </dl>
      </div>
      {address && (
        <div className="contact-map">
          <div className="contact-map-heading">
            <div>
              <p className="eyebrow">LOKALIZACJA</p>
              <h2>Znajdź nas</h2>
              <dl className="contact-details-list contact-location-details">
                <div>
                  <MapPin aria-hidden="true" size={19} />
                  <div>
                    <dt>Adres</dt>
                    <dd className="contact-address">{address}</dd>
                  </div>
                </div>
              </dl>
            </div>
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
