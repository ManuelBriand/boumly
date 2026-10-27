"use client";

import { useState, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Truck, ShoppingBag, Package, MapPin, Phone, Hash, Mail, CalendarClock, MessageSquare, Banknote, CircleSlash, ChevronDown } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { updateOrderStatus } from "@/services/order.service";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus, FulfillmentMethod } from "@/types";
import { getScheduleBucket, formatRequestedDate, type ScheduleBucket } from "@/lib/scheduling";

const BUCKET_BADGE: Record<
  Exclude<ScheduleBucket, "past">,
  { key: string; className: string }
> = {
  today: { key: "today", className: "bg-primary/10 text-primary" },
  tomorrow: { key: "tomorrow", className: "bg-amber-50 text-amber-600" },
  upcoming: { key: "upcoming", className: "bg-muted text-muted-foreground" },
};

const METHOD_BADGE: Record<
  FulfillmentMethod,
  { icon: typeof Truck; className: string }
> = {
  pickup: { icon: ShoppingBag, className: "bg-green-50 text-green-600" },
  local_delivery: { icon: Truck, className: "bg-blue-50 text-blue-600" },
  shipping: { icon: Package, className: "bg-purple-50 text-purple-600" },
};

const statusOptions: { value: OrderStatus; activeClass: string }[] = [
  { value: "new", activeClass: "bg-blue-500 text-white" },
  { value: "preparing", activeClass: "bg-amber-500 text-white" },
  { value: "ready", activeClass: "bg-green-500 text-white" },
  { value: "completed", activeClass: "bg-gray-500 text-white" },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("orderCard");
  const tff = useTranslations("fulfillment");
  const tStatus = useTranslations("dashboard.orders.tabs");
  const locale = useLocale();

  async function handleStatusChange(value: OrderStatus) {
    if (value === order.status) return;
    try {
      await updateOrderStatus(order.id, value);
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("statusUpdateError"));
    }
  }

  const badge = METHOD_BADGE[order.fulfillmentMethod];
  const BadgeIcon = badge?.icon;
  const hasAddress = order.address || order.city;
  const fullAddress = [
    order.address,
    order.addressComplement,
    [order.zipCode, order.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join("\n");
  const requested = order.requestedDate ? formatRequestedDate(order.requestedDate) : null;
  const bucket = getScheduleBucket(order.requestedDate);
  const bucketBadge = bucket && bucket !== "past" ? BUCKET_BADGE[bucket] : null;
  const itemCount = order.items.reduce((n, it) => n + it.quantity, 0);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-border transition-shadow hover:shadow-sm overflow-hidden">
      {/* ── En-tête cliquable (vue repliée) ─────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="font-bold text-foreground text-base truncate">
              {order.customerName}
            </p>
            <span className="shrink-0 text-lg font-bold text-foreground">
              {formatCurrency(order.total, order.currency, locale)}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <StatusBadge status={order.status} />
            {order.payment === "cash" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                <Banknote className="h-3 w-3" />
                {t("cash")}
              </span>
            )}
            {order.payment === "none" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                <CircleSlash className="h-3 w-3" />
                {t("notCollected")}
              </span>
            )}
            {badge && BadgeIcon && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                badge.className
              )}>
                <BadgeIcon className="h-3 w-3" />
                {tff(order.fulfillmentMethod)}
              </span>
            )}
            {bucketBadge && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                bucketBadge.className
              )}>
                <CalendarClock className="h-3 w-3" />
                {t(`bucket.${bucketBadge.key}`)}
              </span>
            )}
          </div>

          {/* Résumé rapide */}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("itemCount", { count: itemCount })}
            {requested ? ` · ${requested}${order.requestedTime ? ` · ${order.requestedTime}` : ""}` : ""}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* ── Corps déplié (détail complet) ───────────────────────── */}
      {open && (
        <div className="border-t border-border">
          {/* Réf + date de commande */}
          <div className="flex items-center justify-between gap-2 px-4 pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-mono">
              <Hash className="h-3 w-3" />
              {order.id.slice(-8).toUpperCase()}
            </span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>

          {/* Contact — actions rapides */}
          <div className="px-4 py-3">
            <SectionLabel>{t("contact")}</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`tel:${order.customerPhone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5" />
                {order.customerPhone}
              </a>
              {order.customerEmail && (
                <a
                  href={`mailto:${order.customerEmail}`}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{order.customerEmail}</span>
                </a>
              )}
            </div>
          </div>

          {/* Réception */}
          <div className="border-t border-border px-4 py-3">
            <SectionLabel>{t("fulfillment")}</SectionLabel>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {BadgeIcon && (
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", badge.className)}>
                  <BadgeIcon className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="font-medium text-foreground">
                {tff(order.fulfillmentMethod)}
              </span>
              {order.fulfillmentFee > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatCurrency(order.fulfillmentFee, order.currency, locale)}
                </span>
              )}
            </div>

            {hasAddress && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                <p className="whitespace-pre-line text-xs leading-snug text-foreground">{fullAddress}</p>
              </div>
            )}
            {requested && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">
                <CalendarClock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-snug text-foreground">
                  {requested}
                  {order.requestedTime ? ` · ${order.requestedTime}` : ""}
                </p>
              </div>
            )}
          </div>

          {/* Note */}
          {order.note && (
            <div className="border-t border-border px-4 py-3">
              <SectionLabel>{t("note")}</SectionLabel>
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="whitespace-pre-line text-xs leading-snug text-foreground">{order.note}</p>
              </div>
            </div>
          )}

          {/* Articles */}
          <div className="border-t border-border bg-muted/20 px-4 py-3">
            <SectionLabel>{t("items")} · {itemCount}</SectionLabel>
            <div className="mt-2 space-y-2.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 px-1.5 text-xs font-bold text-primary">
                      {item.quantity}×
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium leading-snug text-foreground">{item.name}</p>
                      {item.variantLabel && (
                        <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                      )}
                      {item.customFieldValue && (
                        <p className="text-xs italic text-primary">&laquo;&nbsp;{item.customFieldValue}&nbsp;&raquo;</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 font-medium text-foreground">
                    {formatCurrency(item.price * item.quantity, order.currency, locale)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totaux */}
            <div className="mt-3 space-y-1 border-t border-border pt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("subtotal")}</span>
                <span>{formatCurrency(order.subtotal, order.currency, locale)}</span>
              </div>
              {order.fulfillmentFee > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("feeFor", { method: tff(order.fulfillmentMethod).toLowerCase() })}</span>
                  <span>{formatCurrency(order.fulfillmentFee, order.currency, locale)}</span>
                </div>
              )}
              {order.discount ? (
                <div className="flex items-center justify-between text-xs text-emerald-600">
                  <span>{t("discount")}{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                  <span>−{formatCurrency(order.discount, order.currency, locale)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-foreground">{t("totalPaid")}</span>
                <span className="text-base font-bold text-foreground">{formatCurrency(order.total, order.currency, locale)}</span>
              </div>
            </div>

            {/* Reversement */}
            {order.netAmount != null && (
              <div className="mt-2 space-y-1 rounded-xl bg-white p-3 ring-1 ring-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("platformCommission")}</span>
                  <span>−{formatCurrency(order.applicationFee ?? 0, order.currency, locale)}</span>
                </div>
                {order.stripeFee != null && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("stripeFeeLabel")}</span>
                    <span>−{formatCurrency(order.stripeFee, order.currency, locale)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{t("youReceive")}</span>
                  <span className="font-semibold text-green-600">{formatCurrency(order.netAmount, order.currency, locale)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Contrôle de statut */}
          <div className="border-t border-border px-4 py-3">
            <SectionLabel>{t("status")}</SectionLabel>
            <div className="mt-2 flex gap-1 rounded-xl bg-muted p-1">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(opt.value)}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all",
                    order.status === opt.value
                      ? opt.activeClass + " shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tStatus(opt.value)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
