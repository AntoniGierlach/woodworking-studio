import type { Metadata } from "next";
import { Suspense } from "react";
import ScrollToTop from "./scroll-to-top";
import "./globals.css";

export const metadata: Metadata = {
  title: "Puszczawik - Meble z naturalnego drewna",
  description:
    "Warsztat mebli ze szlachetnego drewna, w tym dębu i orzecha.",
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
