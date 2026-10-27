"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Users, ShoppingBag, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeToOrders } from "@/services/order.service";
import { getReservationsByBoutique } from "@/services/reservation.service";
import { getRegistrationsByOrganizer } from "@/services/eventRegistration.service";
import { getStoreByOwnerId } from "@/services/store.service";
import { deriveClients, reservationPurchases, registrationPurchases, type Purchase } from "@/lib/clients";
import { formatCurrency } from "@/lib/utils";
import { currencyForCountry } from "@/lib/countries";
import type { Order } from "@/types";

export default function ClientsPage() {
  const { store } = useAuth();
  const currency = currencyForCountry(store?.country);
  const locale = useLocale();
  const t = useTranslations("dashboard.clients");
  const [orders, setOrders] = useState<Order[]>([]);
  const [extras, setExtras] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!store) return;
    const unsub = subscribeToOrders(store.id, (o) => {
      setOrders(o);
      setLoading(false);
    });
    return unsub;
  }, [store]);

  // Clients issus des ateliers (réservations confirmées) + des stands de marché
  // (inscriptions payées). Contact stand = boutique publique de l'artisan.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    (async () => {
      try {
        const [reservations, registrations] = await Promise.all([
          getReservationsByBoutique(store.id),
          getRegistrationsByOrganizer(store.id),
        ]);
        const paid = registrations.filter((r) => r.status === "paid");
        const storeIds = [...new Set(paid.map((r) => r.storeId))];
        const stores = await Promise.all(storeIds.map((id) => getStoreByOwnerId(id).catch(() => null)));
        const storeById = new Map(storeIds.map((id, i) => [id, stores[i]]));
        if (cancelled) return;
        setExtras([
          ...reservationPurchases(reservations),
          ...registrationPurchases(paid, storeById),
        ]);
      } catch {
        if (!cancelled) setExtras([]);
      }
    })();
    return () => { cancelled = true; };
  }, [store]);

  const clients = useMemo(() => deriveClients(orders, extras), [orders, extras]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q)
    );
  }, [clients, search]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {!loading && clients.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title={t("noResultTitle")}
          description={t("noResultDescription")}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Link
              key={c.key}
              href={`/dashboard/clients/${encodeURIComponent(c.key)}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4 ring-1 ring-border transition-shadow hover:shadow-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold text-foreground">{c.name}</p>
                  {!c.connected && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {t("noAccount")}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">{c.email || c.phone}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-foreground">
                    {formatCurrency(c.totalSpent, currency, locale)}
                  </p>
                  <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <ShoppingBag className="h-3 w-3" />
                    {t("orderCount", { count: c.orderCount })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
