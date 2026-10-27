"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { trackPageView } from "@/lib/analytics";

// Log un page_view à chaque navigation côté client (App Router ne le fait pas
// automatiquement pour les transitions SPA). Monté sur la vitrine uniquement.
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackPageView(
      pathname,
      typeof document !== "undefined" ? document.title : undefined
    );
  }, [pathname]);

  return null;
}
