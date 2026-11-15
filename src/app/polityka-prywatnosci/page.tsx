import type { Metadata } from "next";
import { SiteLayout } from "../site-chrome";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Quercus Fagus | Informacja o prywatności",
  robots: { index: false, follow: false },
};


const PrivacyPolicyPage = async () => {
  const result = await getSiteSettings();
  const settings = result.status === "available" ? result.settings : null;
  const companyName = settings?.company_name?.trim();
  const address = settings?.address?.trim();
  const taxId = settings?.tax_id?.trim();
  const email = settings?.email?.trim();
  const phone = settings?.phone?.trim();
  const phoneLink = phone?.replace(/[^\d+]/g, "");
  const hasAdministratorDetails = companyName || address || taxId;

  return (
    <SiteLayout innerPage repeatBackground>
      <article
        aria-labelledby="privacy-title"
        className="inner-page privacy-page"
      >
        <div className="inner-page-heading page-width privacy-page-heading">
          <h1 id="privacy-title">
            Prywatność i
            <br />
            <em>ochrona danych.</em>
          </h1>
          <p>
            Dbamy o prywatność osób odwiedzających naszą stronę. Poniżej
            znajdziesz informacje o tym, jakie dane zbieramy, w jakim celu je
            wykorzystujemy i jakie przysługują Ci prawa.
          </p>
          <p className="privacy-updated">
            Ostatnia aktualizacja:{" "}
            <time dateTime="2026-11-15">15.11.2026</time>
          </p>
        </div>

        <div className="page-width privacy-content">
          {result.status === "unavailable" && (
            <p className="privacy-info-notice" role="status">
              Dane administratora są chwilowo niedostępne. Informacje można
              uzyskać przez formularz kontaktowy.
            </p>
          )}
          <section>
            <h2>1. Administrator danych</h2>
            <p>
              Administratorem danych osobowych jest:
            </p>
            {hasAdministratorDetails ? (
              <dl className="privacy-admin-details">
                {companyName && (
                  <div>
                    <dt>Nazwa administratora</dt>
                    <dd>{companyName}</dd>
                  </div>
                )}
                {address && (
                  <div>
                    <dt>Adres siedziby</dt>
                    <dd className="privacy-address">{address}</dd>
                  </div>
                )}
                {taxId && (
                  <div>
                    <dt>NIP</dt>
                    <dd>{taxId}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="privacy-info-notice">
                Dane administratora nie zostały jeszcze uzupełnione.
              </p>
            )}
            <p>
              Kontakt w sprawach związanych z ochroną danych:{" "}
              {email ? (
                <a href={`mailto:${encodeURIComponent(email)}`}>{email}</a>
              ) : (
                <span>adres e-mail nie został skonfigurowany</span>
              )}
              .
            </p>
          </section>

          <section>
            <h2>2. Jakie dane zbieramy?</h2>
            <p>
              W zależności od sposobu korzystania z serwisu
              możemy przetwarzać:
            </p>
            <ul>
              <li>imię i nazwisko;</li>
              <li>adres e-mail i numer telefonu;</li>
              <li>treść wiadomości i zapytań ofertowych;</li>
              <li>
                informacje dotyczące planowanych mebli
                i indywidualnych projektów;
              </li>
              <li>
                zdjęcia, projekty i inne pliki przesłane
                przez formularz kontaktowy;
              </li>
              <li>
                dane techniczne, takie jak adres IP,
                informacje o przeglądarce i urządzeniu.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Cele i podstawy przetwarzania</h2>
            <p>Dane przetwarzamy w celu:</p>
            <ul>
              <li>
                obsługi formularza kontaktowego i udzielania
                odpowiedzi na zapytania;
              </li>
              <li>
                przygotowywania indywidualnych wycen
                i ofert;
              </li>
              <li>
                zawierania i realizacji umów;
              </li>
              <li>
                obsługi reklamacji i ewentualnych roszczeń;
              </li>
              <li>
                zapewnienia bezpieczeństwa i prawidłowego
                działania strony;
              </li>
              <li>
                prowadzenia statystyk, jeśli użytkownik
                wyraził wymaganą zgodę.
              </li>
            </ul>
            <p>
              Podstawami prawnymi są odpowiednio art. 6 ust. 1
              lit. a, b, c lub f RODO, zależnie od celu
              przetwarzania.
            </p>
          </section>

          <section>
            <h2>4. Dobrowolność podania danych</h2>
            <p>
              Podanie danych jest dobrowolne, ale może być
              konieczne do obsługi zapytania, przygotowania
              wyceny lub realizacji zamówienia. Brak danych
              kontaktowych może uniemożliwić udzielenie
              odpowiedzi.
            </p>
          </section>

          <section>
            <h2>5. Odbiorcy danych</h2>
            <p>
              Dane mogą być przekazywane podmiotom wspierającym
              prowadzenie serwisu i działalności, w szczególności
              dostawcom hostingu, poczty elektronicznej,
              usług IT, firmom transportowym, biurom
              rachunkowym i kancelariom prawnym – jeżeli
              jest to niezbędne do realizacji określonych celów.
            </p>
          </section>

          <section>
            <h2>6. Przekazywanie danych poza EOG</h2>
            <p>
              Niektórzy dostawcy usług technologicznych mogą
              przetwarzać dane poza Europejskim Obszarem
              Gospodarczym. W takim przypadku przekazywanie
              odbywa się z zastosowaniem mechanizmów ochrony
              przewidzianych przez RODO, o ile mają zastosowanie.
            </p>
          </section>

          <section>
            <h2>7. Okres przechowywania danych</h2>
            <p>
              Dane przechowujemy przez okres niezbędny do
              realizacji celu, w którym zostały zebrane.
              Dane dotyczące zapytań przechowujemy przez czas
              obsługi korespondencji i uzasadniony okres
              związany z ewentualnymi roszczeniami. Dokumentację
              księgową przechowujemy przez okres wynikający
              z przepisów prawa.
            </p>
            <p>
              W celu ograniczenia nadużyć formularza przechowujemy czasowo
              zabezpieczone skróty adresów sieciowych oraz liczniki prób.
              Wygasłe wpisy są okresowo usuwane podczas kolejnych zgłoszeń,
              najwcześniej dobę po zakończeniu okresu ograniczenia.
            </p>
          </section>

          <section>
            <h2>8. Pliki przesyłane przez formularz</h2>
            <p>
              Załączniki, takie jak zdjęcia, inspiracje
              i projekty mebli, wykorzystywane są w celu
              przygotowania wyceny, obsługi zapytania
              lub realizacji zamówienia.
            </p>
            <p>
              Pliki przechowujemy przez okres niezbędny
              do realizacji tych celów, z uwzględnieniem
              obowiązków prawnych i ewentualnych roszczeń.
            </p>
          </section>

          <section>
            <h2>9. Twoje prawa</h2>
            <p>
              W związku z przetwarzaniem danych przysługuje Ci:
            </p>
            <ul>
              <li>prawo dostępu do danych i otrzymania ich kopii;</li>
              <li>prawo do sprostowania danych;</li>
              <li>prawo do usunięcia danych;</li>
              <li>prawo do ograniczenia przetwarzania;</li>
              <li>prawo do przenoszenia danych;</li>
              <li>prawo do wniesienia sprzeciwu;</li>
              <li>prawo do wycofania zgody w dowolnym momencie.</li>
            </ul>
            <p>
              Możesz również wnieść skargę do Prezesa Urzędu
              Ochrony Danych Osobowych.
            </p>
          </section>

          <section>
            <h2>10. Pliki cookies</h2>
            <p>
              Strona może wykorzystywać pliki cookies
              niezbędne do jej prawidłowego działania,
              zapamiętywania preferencji oraz – po uzyskaniu
              odpowiedniej zgody – prowadzenia statystyk
              i korzystania z dodatkowych funkcjonalności.
            </p>
            <p>
              Ustawieniami cookies możesz zarządzać
              za pośrednictwem przeglądarki oraz dostępnego
              na stronie mechanizmu zarządzania zgodami.
            </p>
          </section>

          <section>
            <h2>11. Mapa Google i usługi zewnętrzne</h2>
            <p>
              Na stronie może znajdować się mapa Google.
              Jej wyświetlenie może wiązać się z przekazywaniem
              danych technicznych, w tym adresu IP,
              do Google LLC lub innych podmiotów z grupy Google.
            </p>
            <p>
              Szczegółowe informacje znajdują się w
              <a
                href="https://policies.google.com/privacy?hl=pl"
                target="_blank"
                rel="noopener noreferrer"
              >
                {" "}polityce prywatności Google
              </a>.
            </p>
          </section>

          <section>
            <h2>12. Bezpieczeństwo danych</h2>
            <p>
              Stosujemy odpowiednie środki techniczne
              i organizacyjne mające na celu ochronę danych
              przed utratą, nieuprawnionym dostępem,
              ujawnieniem lub modyfikacją.
            </p>
          </section>

          <section>
            <h2>13. Profilowanie</h2>
            <p>
              Dane użytkowników nie są wykorzystywane
              do podejmowania decyzji w sposób wyłącznie
              zautomatyzowany, w tym do profilowania,
              które wywoływałoby skutki prawne lub
              podobnie istotnie wpływało na użytkownika.
            </p>
          </section>

          <section>
            <h2>14. Zmiany polityki prywatności</h2>
            <p>
              Polityka może być aktualizowana w przypadku
              zmian funkcjonalności serwisu, sposobów
              przetwarzania danych lub obowiązujących
              przepisów prawa. Aktualna wersja dokumentu
              jest dostępna na tej stronie.
            </p>
          </section>

          <section>
            <h2>15. Kontakt</h2>
            <p>
              W sprawach dotyczących prywatności i ochrony
              danych osobowych skontaktuj się z nami:
            </p>
            {email || phone || address ? (
              <ul className="privacy-contact-list">
                {email && (
                  <li>
                    E-mail:{" "}
                    <a href={`mailto:${encodeURIComponent(email)}`}>{email}</a>
                  </li>
                )}
                {phone && (
                  <li>
                    Telefon:{" "}
                    {phoneLink && /\d/.test(phoneLink) ? (
                      <a href={`tel:${phoneLink}`}>{phone}</a>
                    ) : (
                      phone
                    )}
                  </li>
                )}
                {address && (
                  <li>
                    Adres: <span className="privacy-address">{address}</span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="privacy-info-notice">
                Dane kontaktowe nie są obecnie skonfigurowane. Skorzystaj z{" "}
                <a href="/kontakt">formularza kontaktowego</a>.
              </p>
            )}
          </section>
        </div>
      </article>
    </SiteLayout>
  );
};

export default PrivacyPolicyPage;
