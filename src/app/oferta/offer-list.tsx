import type { ReactNode } from "react";

export default function OfferList({ children }: { children: ReactNode }) {
  return <div className="service-list page-width offer-list">{children}</div>;
}
