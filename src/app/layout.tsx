import type { Metadata } from "next";
import { Suspense } from "react";
import ScrollToTop from "./scroll-to-top";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meble z naturalnego drewna — dąb i orzech",
  description:
    "Warsztat mebli z naturalnego drewna, w tym dębu i orzecha. Nazwa, lokalizacja i szczegóły oferty wymagają uzupełnienia przed publikacją.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html data-scroll-behavior="smooth" lang="pl">
      <body>
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
