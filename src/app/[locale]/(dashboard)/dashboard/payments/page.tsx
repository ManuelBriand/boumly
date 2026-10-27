"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Store as StoreIcon, Tent, CalendarClock, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectOnboardingCard } from "@/features/store/ConnectOnboardingCard";
import { StripePayoutsPanel } from "@/features/store/StripePayoutsPanel";
import { subscribeToOrders } from "@/services/order.service";
import { getRegistrationsByOrganizer } from "@/services/eventRegistration.service";
import { getReservationsByBoutique } from "@/services/reservation.service";
import { formatCurrency } from "@/lib/utils";
import { currencyForCountry, fromMinorUnits } from "@/lib/countries";
import type { Order, EventRegistration, Reservation } from "@/types";

// Compte Connect unifié : commandes (boutique), stands (marchés) et réservations
// (ateliers) arrivent sur le même compte. Cette page centralise l'activation +
// le panneau Stripe et ventile le CA net par source.
export default function PaymentsPage() {
  const t = useTranslations("payments");
  const { firebaseUser, user, store, loading } = useAuth();
  const currency = currencyForCountry(store?.country);

  const [orders, setOrders] = useState<Order[]>([]);
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [resas, setResas] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!store) return;
    return subscribeToOrders(store.id, setOrders);
  }, [store]);

  useEffect(() => {
    if (!firebaseUser) return;
    getRegistrationsByOrganizer(firebaseUser.uid).then(setRegs).catch(() => setRegs([]));
    getReservationsByBoutique(firebaseUser.uid).then(setResas).catch(() => setResas([]));
  }, [firebaseUser]);

  // netAmount déjà en unités majeures ; fallback : orders → total (majeur),
  // events/résas → amount en centimes → fromMinorUnits.
  const storeNet = orders.reduce((s, o) => s + (o.netAmount ?? o.total), 0);
  const eventsNet = regs
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + (r.netAmount ?? fromMinorUnits(r.amount, r.currency)), 0);
  const ateliersNet = resas
    .filter((r) => r.statut === "confirmee")
    .reduce((s, r) => s + (r.netAmount ?? fromMinorUnits(r.amount, r.currency)), 0);
  const total = storeNet + eventsNet + ateliersNet;

  if (loading) {
    return <div className="p-6 lg:p-8"><Skeleton className="h-8 w-40 rounded-xl" /></div>;
  }
  if (!firebaseUser) return null;

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8 pb-24 md:pb-8 space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {/* Résumé par source */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label={t("sourceStore")}
          value={formatCurrency(storeNet, currency)}
          icon={<StoreIcon className="h-5 w-5" />}
        />
        <StatCard
          label={t("sourceEvents")}
          value={formatCurrency(eventsNet, currency)}
          icon={<Tent className="h-5 w-5" />}
        />
        <StatCard
          label={t("sourceAteliers")}
          value={formatCurrency(ateliersNet, currency)}
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </div>
      <StatCard
        label={t("total")}
        value={formatCurrency(total, currency)}
        icon={<Wallet className="h-5 w-5" />}
        info={t("netHint")}
      />

      {/* Compte Stripe : activation + soldes/virements/paiements (compte unifié) */}
      {store ? (
        <ConnectOnboardingCard firebaseUser={firebaseUser} target="seller" store={store} />
      ) : user?.stripeChargesEnabled ? (
        <div className="rounded-2xl border border-border bg-white p-5">
          <StripePayoutsPanel firebaseUser={firebaseUser} target="organizer" />
        </div>
      ) : (
        <ConnectOnboardingCard firebaseUser={firebaseUser} target="organizer" />
      )}
    </div>
  );
}
