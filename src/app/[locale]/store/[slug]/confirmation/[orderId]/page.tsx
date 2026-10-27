"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Phone, Truck, ShoppingBag, MapPin, Package, CalendarClock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getOrderById } from "@/services/order.service";
import { getStoreBySlug } from "@/services/store.service";
import { useAuth } from "@/hooks/useAuth";
import { AccountButton } from "@/features/account/AccountButton";
import { formatCurrency } from "@/lib/utils";
import { trackPurchase } from "@/lib/analytics";
import type { Order, Store, FulfillmentMethod } from "@/types";
import { formatRequestedDate } from "@/lib/scheduling";
import { Skeleton } from "@/components/ui/skeleton";

const METHOD_ICON: Record<FulfillmentMethod, typeof Truck> = {
  pickup: ShoppingBag,
  local_delivery: Truck,
  shipping: Package,
};

// Une commande est "confirmée" quand le paiement est validé (paid via webhook)
// ou qu'il n'y a pas d'encaissement en ligne (payment:"none").
function isConfirmed(o: Order): boolean {
  return o.paid === true || o.payment === "none";
}

export default function ConfirmationPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const { firebaseUser } = useAuth();
  const t = useTranslations("confirmation");
  const tff = useTranslations("fulfillment");
  const locale = useLocale();
  const [order, setOrder] = useState<Order | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false); // paiement en cours de validation (webhook en retard)

  // purchase une seule fois par commande confirmée (garde sessionStorage :
  // évite le doublon si le client recharge la page de confirmation).
  useEffect(() => {
    if (!order || !isConfirmed(order)) return;
    const key = `purchase_tracked_${order.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    trackPurchase({
      orderId: order.id,
      value: order.total,
      items: order.items.map((it) => ({
        item_id: it.productId,
        item_name: it.name,
        price: it.price,
        quantity: it.quantity,
      })),
      coupon: order.promoCode,
      currency: order.currency,
    });
  }, [order]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    getStoreBySlug(slug).then((s) => {
      if (!cancelled) setStore(s);
    });

    // Le webhook Stripe flippe `paid` de façon asynchrone : on interroge la
    // commande jusqu'à confirmation (max ~15s), sinon on affiche l'état "en cours".
    let attempts = 0;
    const MAX_ATTEMPTS = 8;
    async function poll() {
      const o = await getOrderById(orderId);
      if (cancelled) return;

      if (o && isConfirmed(o)) {
        setOrder(o);
        setPending(false);
        setLoading(false);
        return;
      }

      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        setOrder(o);                 // null → "introuvable" ; sinon → "en cours"
        setPending(!!o);
        setLoading(false);
        return;
      }
      setLoading(false);
      setPending(true);
      timer = setTimeout(poll, 1800);
    }
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-6 w-48 rounded-xl" />
        </div>
      </div>
    );
  }

  // Paiement pas encore confirmé côté serveur (webhook en retard).
  if (pending && (!order || !isConfirmed(order))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-foreground">{t("validating")}</p>
          <p className="text-xs text-muted-foreground">
            {t("validatingHint")}
          </p>
        </div>
      </div>
    );
  }

  if (!order || !isConfirmed(order)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("orderNotFound")}</p>
      </div>
    );
  }

  const phoneUrl = store?.phone ? `tel:${store.phone.replace(/\s/g, "")}` : null;
  const MethodIcon = METHOD_ICON[order.fulfillmentMethod];
  const isPickup = order.fulfillmentMethod === "pickup";
  const fullAddress = [order.address, [order.zipCode, order.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join("\n");
  const requested = order.requestedDate ? formatRequestedDate(order.requestedDate) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-6 flex justify-end">
          <AccountButton />
        </div>
        {/* Success icon */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("confirmedTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("thanks", { name: order.customerName })}
          </p>
        </div>

        {/* Order details */}
        <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("orderNumber")}</span>
            <span className="font-mono text-sm font-semibold text-foreground">
              #{order.id.slice(-8).toUpperCase()}
            </span>
          </div>

          {/* Fulfillment */}
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3">
            <MethodIcon className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                {tff(order.fulfillmentMethod)}
              </p>
              {!isPickup && fullAddress && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{fullAddress}</p>
              )}
              {isPickup && store?.address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line flex items-start gap-1">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {store.address}
                </p>
              )}
              {requested && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  {requested}
                  {order.requestedTime ? ` · ${order.requestedTime}` : ""}
                </p>
              )}
            </div>
          </div>

          {/* Note du client */}
          {order.note && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <MessageSquare className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">{t("yourNote")}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{order.note}</p>
              </div>
            </div>
          )}

          <Separator className="mb-4" />

          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {item.quantity}× {item.name}
                </span>
                <span className="font-medium">
                  {formatCurrency(item.price * item.quantity, order.currency, locale)}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {order.fulfillmentFee > 0 && (
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{tff(order.fulfillmentMethod)}</span>
              <span>{formatCurrency(order.fulfillmentFee, order.currency, locale)}</span>
            </div>
          )}

          {order.discount ? (
            <div className="mb-2 flex items-center justify-between text-sm text-emerald-600">
              <span>{t("discount")}{order.promoCode ? ` (${order.promoCode})` : ""}</span>
              <span>−{formatCurrency(order.discount, order.currency, locale)}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{t("total")}</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(order.total, order.currency, locale)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {phoneUrl && (
            <a href={phoneUrl} className="block">
              <Button className="h-12 w-full gap-2 rounded-2xl font-semibold">
                <Phone className="h-5 w-5" />
                {t("callCreator")}
              </Button>
            </a>
          )}
          {firebaseUser && (
            <Link href="/account" className="block">
              <Button variant="outline" className="h-11 w-full gap-2 rounded-2xl font-medium">
                <Package className="h-4 w-4" />
                {t("viewMyOrders")}
              </Button>
            </Link>
          )}
          <Link href={`/store/${slug}`} className="block">
            <Button
              variant="outline"
              className="h-11 w-full rounded-2xl font-medium"
            >
              {t("backToStore")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
