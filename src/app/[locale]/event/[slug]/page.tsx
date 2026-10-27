import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MapPin, CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getEventBySlugServer, getPaidExhibitors } from "@/lib/event-server";
import { truncate, formatDate, formatCurrency } from "@/lib/utils";
import { fromMinorUnits } from "@/lib/countries";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { AccountButton } from "@/features/account/AccountButton";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boumly.com";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export function generateViewport(): Viewport {
  return { width: "device-width", initialScale: 1, themeColor: "#ffffff" };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const event = await getEventBySlugServer(slug);
  if (!event || event.status !== "published") {
    return { title: "Boumly", robots: { index: false } };
  }
  const description = truncate(
    event.description || `Découvrez le marché artisanal ${event.name} sur Boumly.`
  );
  return {
    title: `${event.name} — Marché artisanal | Boumly`,
    description,
    alternates: { canonical: `/${locale}/event/${slug}` },
    openGraph: {
      type: "website",
      title: `${event.name} — Marché artisanal`,
      description,
      url: `/${locale}/event/${slug}`,
      images: event.photoUrl ? [event.photoUrl] : [],
    },
  };
}

export default async function EventPublicPage({ params }: Props) {
  const { slug, locale } = await params;
  const event = await getEventBySlugServer(slug);
  if (!event || event.status !== "published") notFound();

  const [exhibitors, t] = await Promise.all([
    getPaidExhibitors(event.id),
    getTranslations("eventPublic"),
  ]);

  const dates = (event.schedule?.nextDates ?? []).map((ts) => ts.toDate());
  const hasGeo = typeof event.lat === "number" && typeof event.lng === "number";
  const url = `${BASE}/${locale}/event/${slug}`;

  // Prix d'appel (le plus bas) pour affichage.
  const prices: number[] = [];
  if (event.pricing?.fixedPrice != null) prices.push(event.pricing.fixedPrice);
  (event.pricing?.categories ?? []).forEach((c) => prices.push(c.price));
  const minPrice = prices.length ? Math.min(...prices) : null;

  const address = event.address || "";
  const geo = hasGeo ? { "@type": "GeoCoordinates", latitude: event.lat, longitude: event.lng } : undefined;
  const place = {
    "@type": "Place",
    name: event.name,
    ...(address && { address }),
    ...(geo && { geo }),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Event",
        name: event.name,
        description: event.description || `Marché artisanal ${event.name}.`,
        ...(dates[0] && { startDate: dates[0].toISOString() }),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: place,
        url,
        ...(event.photoUrl && { image: event.photoUrl }),
      },
      {
        "@type": "LocalBusiness",
        name: event.name,
        ...(address && { address }),
        ...(geo && { geo }),
        ...(event.photoUrl && { image: event.photoUrl }),
        url,
      },
    ],
  };

  const staticMap =
    hasGeo && MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ff4d6d(${event.lng},${event.lat})/${event.lng},${event.lat},13,0/600x300@2x?access_token=${MAPBOX_TOKEN}`
      : null;

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className="mx-auto max-w-2xl p-4 sm:p-6 space-y-6">
        <div className="flex justify-end">
          <AccountButton />
        </div>

        {/* Hero */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden rounded-3xl bg-muted">
          {event.photoUrl ? (
            <Image src={event.photoUrl} alt={event.name} fill priority className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">🛒</div>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{event.name}</h1>
          {event.schedule?.description && (
            <p className="mt-1 text-sm text-muted-foreground">{event.schedule.description}</p>
          )}
        </div>

        {event.description && (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{event.description}</p>
        )}

        {/* Exposants — présents au marché */}
        {exhibitors.length > 0 && (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">{t("exhibitors")}</h2>
              <p className="text-sm text-muted-foreground">{t("exhibitorsSub")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {exhibitors.map((ex) => (
                <Link
                  key={ex.storeId}
                  href={`/store/${ex.slug}`}
                  className="rounded-2xl border border-border bg-white p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-xl bg-muted">
                    {ex.photoUrl ? (
                      <Image src={ex.photoUrl} alt={ex.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">🛍️</div>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium text-foreground">{ex.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Prochaines dates */}
        {dates.length > 0 && (
          <div className="rounded-2xl border border-border bg-white p-4 space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" /> {t("nextDates")}
            </p>
            <div className="flex flex-wrap gap-2">
              {dates.map((d, i) => (
                <span key={i} className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {formatDate(d)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Localisation */}
        {address && (
          <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" /> {address}
            </p>
            {staticMap && (
              <div className="relative h-40 w-full overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={staticMap} alt={event.name} className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {event.registrationOpen && (
          <div className="sticky bottom-4 rounded-2xl border border-border bg-white p-4 shadow-lg">
            {minPrice != null && (
              <p className="mb-2 text-center text-sm text-muted-foreground">
                {t("fromPrice", { price: formatCurrency(fromMinorUnits(minPrice, event.currency), event.currency) })}
              </p>
            )}
            <Link href={`/event/${slug}/register`}>
              <Button className="h-12 w-full rounded-xl font-semibold">{t("requestSpot")}</Button>
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
