"use client";

import { useTranslations } from "next-intl";
import { Tent } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ExhibitorEventBadge } from "@/lib/event-server";

interface MarketBadgesProps {
  events: ExhibitorEventBadge[];
}

/**
 * Chips « Exposant au marché X » renvoyant vers les événements où la boutique
 * expose. Partagé entre la page boutique et les fiches produit / atelier.
 */
export function MarketBadges({ events }: MarketBadgesProps) {
  const t = useTranslations("store");
  if (events.length === 0) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <div className="flex flex-wrap gap-2">
        {events.map((m) => (
          <Link
            key={m.eventId}
            href={`/event/${m.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
          >
            <Tent className="h-3.5 w-3.5" />
            {t("exhibitorBadge", { event: m.name })}
          </Link>
        ))}
      </div>
    </div>
  );
}
