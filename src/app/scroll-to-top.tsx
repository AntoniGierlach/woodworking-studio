"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

export default function ScrollToTop() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useLayoutEffect(() => {
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = previousRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      if (!window.location.hash) {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    }
  }, [pathname]);

  return null;
}
