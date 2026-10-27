"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ShoppingBag, Wallet, Phone, Mail, CalendarClock, Tent } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { OrderCard } from "@/features/orders/OrderCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeToOrders } from "@/services/order.service";
import { getReservationsByBoutique } from "@/services/reservation.service";
import { getRegistrationsByOrganizer } from "@/services/eventRegistration.service";
import { getStoreByOwnerId } from "@/services/store.service";
import {
  clientKey, reservationKey, registrationKey,
  reservationPurchases, registrationPurchases, deriveClients,
} from "@/lib/clients";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { currencyForCountry, fromMinorUnits } from "@/lib/countries";
import type { Order, Reservation, EventRegistration, Store } from "@/types";

function formatSlotUTC(ts: { toDate: () => Date }): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(ts.toDate());
}

const RESA_STATUS_KEY: Record<string, string> = {
  confirmee: "statusConfirmee", en_attente: "statusEnAttente",
  payment_pending: "statusPaymentPending", annulee_createur: "statusAnnulee", terminee: "statusTerminee",
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const key = useMemo(() => {
    try { return decodeURIComponent(id); } catch { return id; }
  }, [id]);
  const { store } = useAuth();
  const currency = currencyForCountry(store?.country);
  const locale = useLocale();
  const t = useTranslations("clientDetail");
  const tc = useTranslations("dashboard.clients");
  const ta = useTranslations("ateliers");

  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [storeById, setStoreById] = useState<Map<string, Store | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [extrasLoaded, setExtrasLoaded] = useState(false);

  useEffect(() => {
    if (!store) return;
    const unsub = subscribeToOrders(store.id, (o) => {
      setOrders(o);
      setLoading(false);
    });
    return unsub;
  }, [store]);

  // Ateliers (réservations) + stands (inscriptions payées) du même client.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    (async () => {
      try {
        const [resas, regs] = await Promise.all([
          getReservationsByBoutique(store.id),
          getRegistrationsByOrganizer(store.id),
        ]);
        const paid = regs.filter((r) => r.status === "paid");
        const ids = [...new Set(paid.map((r) => r.storeId))];
        const stores = await Promise.all(ids.map((i) => getStoreByOwnerId(i).catch(() => null)));
        if (cancelled) return;
        setReservations(resas);
        setRegistrations(paid);
        setStoreById(new Map(ids.map((i, idx) => [i, stores[idx]])));
      } catch {
        if (!cancelled) { setReservations([]); setRegistrations([]); }
      } finally {
        if (!cancelled) setExtrasLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [store]);

  const clientOrders = useMemo(
    () => orders.filter((o) => clientKey(o) === key).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
    [orders, key]
  );
  const clientResas = useMemo(
    () => reservations
      .filter((r) => (r.statut === "confirmee" || r.statut === "terminee") && reservationKey(r) === key)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
    [reservations, key]
  );
  const clientRegs = useMemo(
    () => registrations
      .filter((r) => registrationKey(r, storeById.get(r.storeId) ?? null) === key)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
    [registrations, storeById, key]
  );

  // Profil unifié (nom/email/tél de l'achat le plus récent) + totaux.
  const summary = useMemo(
    () => deriveClients(clientOrders, [
      ...reservationPurchases(clientResas),
      ...registrationPurchases(clientRegs, storeById),
    ])[0],
    [clientOrders, clientResas, clientRegs, storeById]
  );

  const empty = !summary;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("title")}
      </Link>

      {loading || !extrasLoaded ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      ) : empty ? (
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
        />
      ) : (
        <>
          {/* En-tête client */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{summary.name}</h1>
              {!summary.connected && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {tc("noAccount")}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-4">
              {summary.phone && (
                <a
                  href={`tel:${summary.phone.replace(/\s/g, "")}`}
                  className="inline-flex w-fit items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {summary.phone}
                </a>
              )}
              {summary.email && (
                <a
                  href={`mailto:${summary.email}`}
                  className="inline-flex w-fit items-center gap-1.5 break-all font-medium text-foreground transition-colors hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {summary.email}
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label={t("ordersLabel")}
              value={summary.orderCount}
              icon={<ShoppingBag className="h-5 w-5" />}
            />
            <StatCard
              label={t("totalSpent")}
              value={formatCurrency(summary.totalSpent, currency, locale)}
              icon={<Wallet className="h-5 w-5" />}
            />
          </div>

          {/* Commandes boutique */}
          {clientOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{t("ordersTitle")}</h2>
              {clientOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}

          {/* Ateliers réservés */}
          {clientResas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{t("workshopsTitle")}</h2>
              {clientResas.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white ring-1 ring-border p-4">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarClock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{r.prestationNom ?? ta("title")}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.dateHeure ? formatSlotUTC(r.dateHeure) : ""} · {formatCurrency(fromMinorUnits(r.amount, r.currency), r.currency, locale)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{ta(RESA_STATUS_KEY[r.statut])}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Stands de marché */}
          {clientRegs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{t("standsTitle")}</h2>
              {clientRegs.map((r) => (
                <Link
                  key={r.id}
                  href={`/event/${r.eventSlug}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white ring-1 ring-border p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Tent className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{r.eventName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(r.createdAt)} · {formatCurrency(fromMinorUnits(r.amount, r.currency), r.currency, locale)}
                      </p>
                    </div>
                  </div>
                  <Badge className="shrink-0">{t("standPaid")}</Badge>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
