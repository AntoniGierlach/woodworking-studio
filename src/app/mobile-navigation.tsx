"use client";

import { useRef } from "react";
import Link from "next/link";

type NavigationItem = {
  href: string;
  label: string;
};

export default function MobileNavigation({
  navigation,
}: {
  navigation: NavigationItem[];
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }

  return (
    <details className="mobile-nav" ref={menuRef}>
      <summary aria-label="Otwórz menu nawigacji">
        <span>Menu</span>
      </summary>
      <nav aria-label="Nawigacja mobilna">
        {navigation.map((item) => (
          <Link href={item.href} key={item.href} onClick={closeMenu}>
            {item.label}
          </Link>
        ))}
        <Link className="mobile-menu-cta" href="/kontakt" onClick={closeMenu}>
          Skontaktuj się
        </Link>
      </nav>
    </details>
  );
}
