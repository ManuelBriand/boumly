import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPublishedEvents } from "@/services/event.service";
// import { getActiveStores } from "@/services/store.service";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boumly.com";

// Pages publiques indexables (chemins relatifs sans préfixe de locale).
const STATIC_PATHS = [
  "",
  "/cgu",
  "/cgv",
  "/mentions-legales",
  "/politique-confidentialite",
];

function languagesFor(path: string): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, `${BASE}/${locale}${path}`])
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${BASE}/${locale}${path}`,
      alternates: { languages: languagesFor(path) },
    }))
  );

  // Marchés publiés — pages publiques indexables.
  let eventEntries: MetadataRoute.Sitemap = [];
  try {
    const events = await getPublishedEvents();
    eventEntries = events.flatMap((m) =>
      routing.locales.map((locale) => ({
        url: `${BASE}/${locale}/event/${m.slug}`,
        lastModified: m.updatedAt?.toDate?.() ?? new Date(),
        alternates: { languages: languagesFor(`/event/${m.slug}`) },
      }))
    );
  } catch (err) {
    console.error("[sitemap] marchés indisponibles", err);
  }

  return [...staticEntries, ...eventEntries];
}
