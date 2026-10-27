"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ShoppingBag, List, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { OrderCard } from "@/features/orders/OrderCard";
import { OrdersCalendar } from "@/features/orders/OrdersCalendar";
import { ProductionSummary } from "@/features/orders/ProductionSummary";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeToOrders } from "@/services/order.service";
import { groupOrdersByDate, countsByDate } from "@/lib/orders";
import { formatRequestedDate, toISODate } from "@/lib/scheduling";
import type { Order, OrderStatus } from "@/types";

const tabValues: OrderStatus[] = ["new", "preparing", "ready", "completed"];

const UNDATED = "undated";

export default function OrdersPage() {
  const { store } = useAuth();
  const t = useTranslations("dashboard.orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<string>("liste");
  const [activeTab, setActiveTab] = useState<string>("new");
  const [dayTab, setDayTab] = useState<string>("commandes");
  const [pickedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    const unsub = subscribeToOrders(store.id, (o) => {
      setOrders(o);
      setLoading(false);
    });
    return unsub;
  }, [store]);

  const { byDate, undated } = useMemo(() => groupOrdersByDate(orders), [orders]);
  const counts = useMemo(() => countsByDate(orders), [orders]);

  // Sélection par défaut : aujourd'hui si commandes, sinon 1er jour daté à venir, sinon dernier daté, sinon non programmées
  const defaultDay = useMemo(() => {
    if (orders.length === 0) return null;
    const todayISO = toISODate(new Date());
    const dates = Object.keys(byDate).sort();
    if (byDate[todayISO]) return todayISO;
    const upcoming = dates.find((d) => d >= todayISO);
    if (upcoming) return upcoming;
    if (dates.length > 0) return dates[dates.length - 1];
    if (undated.length > 0) return UNDATED;
    return todayISO;
  }, [orders.length, byDate, undated]);
  const selectedDay = pickedDay ?? defaultDay;

  const filteredOrders = orders.filter((o) => o.status === activeTab);

  const dayOrders =
    selectedDay === UNDATED ? undated : selectedDay ? byDate[selectedDay] ?? [] : [];
  const dayLabel =
    selectedDay === UNDATED
      ? t("unscheduled")
      : selectedDay
      ? formatRequestedDate(selectedDay)
      : "";

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Link href="/dashboard/orders/new">
            <Button className="h-10 gap-1.5 rounded-xl">
              <Plus className="h-4 w-4" />
              {t("newOrder")}
            </Button>
          </Link>
        }
      />

      {/* View switch */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="liste" className="gap-1.5">
            <List className="h-4 w-4" />
            {t("viewList")}
          </TabsTrigger>
          <TabsTrigger value="planning" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {t("viewPlanning")}
          </TabsTrigger>
        </TabsList>

        {/* ── Liste par statut ──────────────────────────────────── */}
        <TabsContent value="liste" className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full sm:w-auto">
              {tabValues.map((value) => {
                const count = orders.filter((o) => o.status === value).length;
                return (
                  <TabsTrigger key={value} value={value} className="gap-1.5">
                    {t(`tabs.${value}`)}
                    {count > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {tabValues.map((value) => (
              <TabsContent key={value} value={value} className="mt-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-52 rounded-2xl" />
                    ))}
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBag className="h-7 w-7" />}
                    title={t("emptyTitle")}
                    description={t("emptyFiltered", {
                      status: t(`tabs.${value}`).toLowerCase(),
                    })}
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* ── Planning par date ─────────────────────────────────── */}
        <TabsContent value="planning" className="mt-4">
          {loading ? (
            <Skeleton className="h-96 rounded-2xl" />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-7 w-7" />}
              title={t("emptyTitle")}
              description={t("emptyPlanning")}
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              {/* Calendrier + non programmées */}
              <div className="space-y-3">
                <OrdersCalendar
                  countsByDate={counts}
                  selected={selectedDay}
                  onSelect={setSelectedDay}
                />
                {undated.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDay(UNDATED)}
                    className={
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors " +
                      (selectedDay === UNDATED
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40")
                    }
                  >
                    <span className="font-medium text-foreground">{t("unscheduled")}</span>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-bold text-muted-foreground">
                      {undated.length}
                    </span>
                  </button>
                )}
              </div>

              {/* Panneau du jour */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold capitalize text-foreground">{dayLabel}</h2>
                  <span className="text-sm text-muted-foreground">
                    {t("orderCount", { count: dayOrders.length })}
                  </span>
                </div>

                {dayOrders.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBag className="h-7 w-7" />}
                    title={t("emptyDayTitle")}
                    description={t("emptyDayDescription")}
                  />
                ) : (
                  <Tabs value={dayTab} onValueChange={setDayTab}>
                    <TabsList>
                      <TabsTrigger value="commandes">{t("dayTabOrders")}</TabsTrigger>
                      <TabsTrigger value="produire">{t("dayTabProduce")}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="commandes" className="mt-4">
                      <div className="space-y-3">
                        {dayOrders.map((order) => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="produire" className="mt-4">
                      <ProductionSummary orders={dayOrders} />
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
