import type { ReactNode } from "react";
import Link from "next/link";

export default function ContentNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="content-notice" role="status">
      <p className="eyebrow">INFORMACJA</p>
      <h2>{title}</h2>
      <p>{children}</p>
      <Link className="button button-dark" href="/kontakt">
        Skontaktuj się
      </Link>
    </div>
  );
}
