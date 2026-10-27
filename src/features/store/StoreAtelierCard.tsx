"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Clock, CreditCard, MapPin, CalendarDays, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { fromMinorUnits } from "@/lib/countries";
// Type-only (le module booking-server est serveur uniquement → effacé à la compilation).
import type { PrestationCard } from "@/lib/booking-server";

function formatNext(ms: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(new Date(ms));
}

export function StoreAtelierCard({ atelier }: { atelier: PrestationCard }) {
  const t = useTranslations("store");
  const online = atelier.modePaiement === "immediat";

  return (
    <Link
      href={`/atelier/${atelier.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {atelier.photoUrl ? (
          <Image src={atelier.photoUrl} alt={atelier.nom} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🎨</div>
        )}
        <div className="absolute left-2 top-2">
          <Badge variant={online ? "default" : "secondary"} className="shadow-sm">
            {online ? (
              <><CreditCard className="mr-1 h-3 w-3" /> {t("paymentOnline")}</>
            ) : (
              <><MapPin className="mr-1 h-3 w-3" /> {t("paymentOnsite")}</>
            )}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="font-semibold text-foreground line-clamp-2">{atelier.nom}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {atelier.dureeMinutes > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {t("minutes", { count: atelier.dureeMinutes })}
            </span>
          )}
          {atelier.nextDateMs && (
            <span className="inline-flex items-center gap-1 capitalize">
              <CalendarDays className="h-3.5 w-3.5" /> {formatNext(atelier.nextDateMs)}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="font-bold text-foreground">
            {formatCurrency(fromMinorUnits(atelier.prix, atelier.currency), atelier.currency)}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            {t("book")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
