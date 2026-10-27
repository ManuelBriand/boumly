import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import {
  getPrestationBySlugServer,
  getUpcomingSlotsServer,
  getStoreByIdServer,
} from "@/lib/booking-server";
import { getExhibitorEvents } from "@/lib/event-server";
import { truncate, formatCurrency } from "@/lib/utils";
import { fromMinorUnits } from "@/lib/countries";
import { JsonLd } from "@/components/seo/JsonLd";
import { AtelierClient } from "./atelier-client";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boumly.com";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export function generateViewport(): Viewport {
  return { width: "device-width", initialScale: 1, themeColor: "#ffffff" };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const prestation = await getPrestationBySlugServer(slug);
  if (!prestation || !prestation.actif) {
    return { title: "Boumly", robots: { index: false } };
  }
  const description = truncate(
    prestation.description || `Réservez l'atelier ${prestation.nom} sur Boumly.`
  );
  return {
    title: `${prestation.nom} — Atelier | Boumly`,
    description,
    alternates: { canonical: `/${locale}/atelier/${slug}` },
    openGraph: {
      type: "website",
      title: `${prestation.nom} — Atelier`,
      description,
      url: `/${locale}/atelier/${slug}`,
      images: prestation.photoUrl ? [prestation.photoUrl] : [],
    },
  };
}

export default async function AtelierPublicPage({ params }: Props) {
  const { slug, locale } = await params;
  const prestation = await getPrestationBySlugServer(slug);
  if (!prestation || !prestation.actif) notFound();

  const slots = await getUpcomingSlotsServer(prestation);
  const url = `${BASE}/${locale}/atelier/${slug}`;

  // Contexte boutique (header + chips marchés). Sérialisable : on ne garde que
  // les champs affichés (pas de Timestamp createdAt de l'Admin SDK).
  const store = prestation.boutiqueId
    ? await getStoreByIdServer(prestation.boutiqueId)
    : null;
  const exhibitorEvents = store ? await getExhibitorEvents(store.id) : [];
  const storeContext = store
    ? {
        slug: store.slug,
        header: {
          name: store.name,
          description: store.description,
          photoUrl: store.photoUrl,
          address: store.address,
          city: store.city,
          email: store.email,
          socials: store.socials,
        },
      }
    : null;

  const nextSlot = slots[0] ? new Date(slots[0].dateHeureMs) : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Event",
        name: prestation.nom,
        description: prestation.description || `Atelier ${prestation.nom}.`,
        ...(nextSlot && { startDate: nextSlot.toISOString() }),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        ...(prestation.photoUrl && { image: prestation.photoUrl }),
        offers: {
          "@type": "Offer",
          price: fromMinorUnits(prestation.prix, prestation.currency),
          priceCurrency: prestation.currency.toUpperCase(),
          url,
        },
        url,
      },
    ],
  };

  const data = {
    id: prestation.id,
    slug: prestation.slug,
    nom: prestation.nom,
    description: prestation.description,
    photoUrl: prestation.photoUrl,
    currency: prestation.currency,
    modePaiement: prestation.modePaiement,
    prix: prestation.prix,
    dureeMinutes: prestation.dureeMinutes,
    priceLabel: formatCurrency(fromMinorUnits(prestation.prix, prestation.currency), prestation.currency),
    slots: slots.map((c) => ({
      id: c.slotKey,
      dateHeureMs: c.dateHeureMs,
      capaciteRestante: c.capaciteRestante,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AtelierClient prestation={data} store={storeContext} exhibitorEvents={exhibitorEvents} />
    </>
  );
}
