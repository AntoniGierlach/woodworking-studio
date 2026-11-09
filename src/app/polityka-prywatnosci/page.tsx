import type { Metadata } from "next";
import { SiteLayout } from "../site-chrome";

export const metadata: Metadata = {
  title: "Informacja o prywatności | Meble z naturalnego drewna",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <SiteLayout>
      <article aria-labelledby="privacy-title" className="inner-page">
        <div className="inner-page-heading page-width">
          <p className="eyebrow">INFORMACJA DLA ODWIEDZAJĄCYCH</p>
          <h1 id="privacy-title">
            Prywatność i
            <br />
            <em>formularz kontaktowy.</em>
          </h1>
          <p>
            Ta sekcja wymaga uzupełnienia przez właściciela pracowni przed
            publikacją serwisu i przyjmowaniem prawdziwych zapytań.
          </p>
        </div>
        <div className="page-width privacy-content">
          <h2>Do uzupełnienia przed uruchomieniem</h2>
          <ul>
            <li>dane i kontakt do administratora danych;</li>
            <li>cel, podstawa i okres przetwarzania danych;</li>
            <li>informacje o odbiorcach danych i prawach osób;</li>
            <li>informacje o załącznikach oraz ich retencji.</li>
            <li>informacje o osadzonej mapie Google, która może łączyć się z serwerami Google i przekazywać dane odwiedzającego.</li>
          </ul>
          <p>
            Nie podano tu fikcyjnych danych administratora ani porad prawnych.
            Treść powinien zatwierdzić właściciel odpowiedzialny za serwis.
          </p>
        </div>
      </article>
    </SiteLayout>
  );
}
