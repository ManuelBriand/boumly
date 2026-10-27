"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Store, CalendarClock } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConnectOnboardingCard } from "@/features/store/ConnectOnboardingCard";
import { getPrestationsByBoutique } from "@/services/booking.service";
import { formatCurrency } from "@/lib/utils";
import { fromMinorUnits } from "@/lib/countries";
import type { Prestation } from "@/types";

export default function AteliersPage() {
  const t = useTranslations("ateliers");
  const { firebaseUser, store, loading } = useAuth();
  const [prestations, setPrestations] = useState<Prestation[] | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getPrestationsByBoutique(firebaseUser.uid).then(setPrestations).catch(() => setPrestations([]));
  }, [firebaseUser]);

  if (loading) {
    return <div className="p-6 lg:p-8"><Skeleton className="h-8 w-40 rounded-xl" /></div>;
  }

  // Un atelier est un produit de la boutique → boutique requise.
  if (!store) {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <div className="mt-6">
          <EmptyState
            icon={<Store className="h-7 w-7" />}
            title={t("needStoreTitle")}
            description={t("needStoreBody")}
            action={
              <Link href="/dashboard/settings">
                <Button className="rounded-xl">{t("createStore")}</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8 pb-24 md:pb-8 space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Link href="/dashboard/ateliers/new">
            <Button className="rounded-xl"><Plus className="h-4 w-4 mr-1" /> {t("create")}</Button>
          </Link>
        }
      />

      {firebaseUser && <ConnectOnboardingCard firebaseUser={firebaseUser} target="seller" hideWhenActive onsiteNote />}

      {prestations === null ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : prestations.length === 0 ? (
        <EmptyState icon={<CalendarClock className="h-7 w-7" />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="space-y-3">
          {prestations.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/ateliers/${p.id}`}
              className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {p.photoUrl ? (
                  <Image src={p.photoUrl} alt={p.nom} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xl">🎨</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{p.nom}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatCurrency(fromMinorUnits(p.prix, p.currency), p.currency)}
                  {" · "}
                  {p.modePaiement === "immediat" ? t("paymentOnline") : t("paymentOnsite")}
                </p>
              </div>
              <Badge variant={p.actif ? "default" : "secondary"}>
                {p.actif ? t("statusActive") : t("statusInactive")}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
