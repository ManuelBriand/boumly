"use client";

import { useEffect, useState } from "react";
import { Package, ShoppingBag, TrendingUp, MessageSquare } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ProductSkeleton } from "@/features/products/ProductSkeleton";
import { OnboardingChecklist } from "@/features/onboarding/OnboardingChecklist";
import { StatusBadge } from "@/features/orders/StatusBadge";
import { subscribeToOrders } from "@/services/order.service";
import { subscribeToProducts } from "@/services/product.service";
import { formatCurrency } from "@/lib/utils";
import { currencyForCountry } from "@/lib/countries";
import type { Order, Product } from "@/types";

export default function DashboardPage() {
  const { store, user } = useAuth();
  const currency = currencyForCountry(store?.country);
  const locale = useLocale();
  const t = useTranslations("dashboard.home");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store) return;

    let resolved = false;
    const unsub1 = subscribeToOrders(store.id, (o) => {
      setOrders(o);
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    });
    const unsub2 = subscribeToProducts(store.id, (p) => {
      setProducts(p);
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    });

    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      unsub1();
      unsub2();
      clearTimeout(timeout);
    };
  }, [store]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(
    (o) => o.createdAt.toDate() >= today
  );

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyOrders = orders.filter(
    (o) => o.createdAt.toDate() >= firstOfMonth
  );
  // CA = commandes encaissées uniquement (exclut "sans encaissement").
  const monthRevenueOrders = monthlyOrders.filter((o) => o.payment !== "none");
  // Net = ce que le vendeur touche réellement (fallback total pour legacy/cash).
  const monthNet = monthRevenueOrders.reduce(
    (sum, o) => sum + (o.netAmount ?? o.total),
    0
  );
  // Brut = volume de ventes (sous-texte, pas de total commission cumulé).
  const monthGross = monthRevenueOrders.reduce((sum, o) => sum + o.total, 0);

  const activeProducts = products.filter((p) => p.active).length;

  const onboardingDone =
    (!!store?.photoUrl && !!store?.description?.trim()) &&
    (!!store?.phone?.trim() || !!store?.email?.trim()) &&
    store?.onboarding?.deliveryReviewed === true &&
    products.length > 0 &&
    store?.stripeChargesEnabled === true;
  const showOnboarding = !!store && !store.onboarding?.dismissed;
  // Boutique encore en cours de config → on masque les stats à zéro.
  const hideStats = showOnboarding && !onboardingDone;

  // Skeleton seulement quand une boutique existe et que ses données chargent.
  // Sans boutique, rien à charger → on rend le dashboard (checklist d'onboarding).
  if (store && loading) {
    return (
      <div className="space-y-8 p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="space-y-3">
          <ProductSkeleton />
          <ProductSkeleton />
          <ProductSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <PageHeader
        title={
          user?.storeName
            ? t("greetingNamed", { name: user.storeName })
            : t("greeting")
        }
        description={t("subtitle")}
      />

      {showOnboarding && store && (
        <OnboardingChecklist store={store} products={products} />
      )}

      {/* Stats */}
      {!hideStats && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("ordersToday")}
          value={todayOrders.length}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          label={t("monthRevenue")}
          value={formatCurrency(monthNet, currency, locale)}
          sub={t("ofSales", { amount: formatCurrency(monthGross, currency, locale) })}
          info={t("revenueInfo")}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label={t("activeProducts")}
          value={activeProducts}
          icon={<Package className="h-5 w-5" />}
        />
      </div>
      )}

      {/* Recent orders */}
      {orders.length > 0 && (
        <div>
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t("recentOrders")}
          </h2>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-border"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {order.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                  {order.note && (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3 shrink-0" />
                      {order.note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={order.status} />
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(order.total, order.currency ?? currency, locale)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
