import Link from "next/link";
import { SiteLayout } from "./site-chrome";

export default function NotFound() {
  return (
    <SiteLayout>
      <section aria-labelledby="not-found-title" className="inner-page">
        <div className="inner-page-heading page-width">
          <p className="eyebrow">404 · NIE ZNALEZIONO STRONY</p>
          <h1 id="not-found-title">
            Nie znaleźliśmy
            <br />
            <em>tej strony.</em>
          </h1>
          <p>
            Strona mogła zostać przeniesiona albo nie jest już opublikowana.
          </p>
          <Link className="button button-dark not-found-link" href="/">
            Wróć na stronę główną  
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
