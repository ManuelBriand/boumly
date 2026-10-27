"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowLeft, Plus, Trash2, Check, Link2, Banknote, CircleSlash } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBookingRange } from "@/hooks/useBookingRange";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import { DatePickerField } from "@/components/shared/DatePickerField";
import { ManualOrderLinkDialog } from "@/features/orders/ManualOrderLinkDialog";
import { subscribeToActiveProducts } from "@/services/product.service";
import { createManualOrder } from "@/services/manual-order.service";
import type { ManualOrderItem, ManualPayment } from "@/lib/manual-order-server";
import { formatCurrency, currencySymbol } from "@/lib/utils";
import { currencyForCountry } from "@/lib/countries";
import { zoneForDestination } from "@/lib/regions";
import { toast } from "sonner";
import type { Product, FulfillmentMethod } from "@/types";

let counter = 0;
const nextUid = () => `it_${counter++}`;

type FormItem =
  | {
      uid: string;
      kind: "product";
      product: Product;
      selectedOptions: Record<string, string>;
      quantity: number;
    }
  | { uid: string; kind: "custom"; name: string; price: number; quantity: number };

// Prix d'une ligne produit = prix de base + ajustements des options choisies.
function productItemPrice(
  product: Product,
  selected: Record<string, string>
): number {
  const base = product.price;
  if (!product.options?.length) return base;
  return product.options.reduce(
    (t, opt) => t + (opt.adjustments?.[selected[opt.name]] ?? 0),
    base
  );
}

function itemUnitPrice(it: FormItem): number {
  return it.kind === "product"
    ? productItemPrice(it.product, it.selectedOptions)
    : it.price;
}

const PAYMENT_OPTIONS: { value: ManualPayment; icon: typeof Link2 }[] = [
  { value: "online", icon: Link2 },
  { value: "cash", icon: Banknote },
  { value: "none", icon: CircleSlash },
];

export default function NewOrderPage() {
  const { store, firebaseUser } = useAuth();
  const currency = currencyForCountry(store?.country);
  const symbol = currencySymbol(currency);
  const router = useRouter();
  const t = useTranslations("newOrder");
  const tff = useTranslations("fulfillment");
  const locale = useLocale();
  const { min, max } = useBookingRange(store);

  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<FormItem[]>([]);
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<ManualPayment>("online");

  // Champs offline (cash / none)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [method, setMethod] = useState<FulfillmentMethod | "">("");
  const [address, setAddress] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [destCountry, setDestCountry] = useState<string | null>(null);
  const [requestedDate, setRequestedDate] = useState<string | undefined>();

  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [emailedTo, setEmailedTo] = useState<string | null>(null);

  const offline = payment !== "online";

  useEffect(() => {
    if (!store) return;
    const unsub = subscribeToActiveProducts(store.id, setProducts);
    return unsub;
  }, [store]);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + itemUnitPrice(it) * it.quantity, 0),
    [items]
  );

  const methods: FulfillmentMethod[] = store
    ? [
        ...(store.pickupEnabled ? (["pickup"] as const) : []),
        ...(store.localDeliveryEnabled ? (["local_delivery"] as const) : []),
        ...(store.shippingEnabled ? (["shipping"] as const) : []),
      ]
    : [];

  const scheduling = store?.schedulingEnabled ?? false;
  const needsAddress = method === "local_delivery" || method === "shipping";
  const needsDate = scheduling && (method === "pickup" || method === "local_delivery");
  const shippingFeeFor = (m: FulfillmentMethod | ""): number => {
    if (m !== "shipping" || !store) return 0;
    if (!store.shippingZones) return store.shippingFee ?? 0; // legacy : tarif plat
    if (!destCountry) return 0; // connu après choix d'adresse
    const z = store.shippingZones[zoneForDestination(store.country, destCountry)];
    return z?.enabled ? z.fee : 0;
  };
  const fee =
    method === "local_delivery"
      ? store?.localDeliveryFee ?? 0
      : method === "shipping"
      ? shippingFeeFor(method)
      : 0;
  const total = subtotal + (offline ? fee : 0);

  function addProduct(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    // Présélectionne la 1re valeur de chaque option → ligne valide + prix défini.
    const selectedOptions: Record<string, string> = {};
    (p.options ?? []).forEach((o) => {
      if (o.values?.length) selectedOptions[o.name] = o.values[0];
    });
    setItems((prev) => [
      ...prev,
      { uid: nextUid(), kind: "product", product: p, selectedOptions, quantity: 1 },
    ]);
  }

  function updateProductOption(uid: string, optName: string, value: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.uid === uid && it.kind === "product"
          ? { ...it, selectedOptions: { ...it.selectedOptions, [optName]: value } }
          : it
      )
    );
  }

  function addCustom() {
    setItems((prev) => [
      ...prev,
      { uid: nextUid(), kind: "custom", name: "", price: 0, quantity: 1 },
    ]);
  }

  function updateItem(uid: string, patch: Partial<FormItem>) {
    setItems((prev) =>
      prev.map((it) => (it.uid === uid ? ({ ...it, ...patch } as FormItem) : it))
    );
  }

  function removeItem(uid: string) {
    setItems((prev) => prev.filter((it) => it.uid !== uid));
  }

  async function submit() {
    if (!firebaseUser) return;
    if (items.length === 0) return toast.error(t("errorNoItem"));
    if (items.some((it) => it.kind === "custom" && !it.name.trim()))
      return toast.error(t("errorCustomName"));

    const payloadItems: ManualOrderItem[] = items.map((it) =>
      it.kind === "product"
        ? {
            kind: "product",
            productId: it.product.id,
            quantity: it.quantity,
            ...(Object.keys(it.selectedOptions).length && {
              selectedOptions: it.selectedOptions,
            }),
          }
        : { kind: "custom", name: it.name.trim(), price: it.price, quantity: it.quantity }
    );

    // Validation offline
    if (offline) {
      if (!customerName.trim()) return toast.error(t("errorCustomerName"));
      if (!customerPhone.trim()) return toast.error(t("errorCustomerPhone"));
      if (!customerEmail.trim()) return toast.error(t("errorCustomerEmail"));
      if (!method) return toast.error(t("errorMethod"));
      if (needsAddress && address.trim().length < 5) return toast.error(t("errorAddress"));
      if (needsDate && !requestedDate) return toast.error(t("errorDate"));
    }

    setSubmitting(true);
    try {
      const res = await createManualOrder(firebaseUser, {
        items: payloadItems,
        payment,
        locale,
        ...(note.trim() && { note: note.trim() }),
        ...(!offline && customerEmail.trim() && { customerEmail: customerEmail.trim() }),
        ...(offline && {
          customer: {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            fulfillmentMethod: method as FulfillmentMethod,
            ...(customerEmail.trim() && { customerEmail: customerEmail.trim() }),
            ...(needsAddress && { address: address.trim() }),
            ...(needsAddress && addressComplement.trim() && { addressComplement: addressComplement.trim() }),
            ...(needsDate && requestedDate && { requestedDate }),
          },
        }),
      });

      if (res.mode === "online") {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setLink(`${origin}/store/${res.slug}/pay/${res.orderId}`);
        const sentTo = res.emailed && customerEmail.trim() ? customerEmail.trim() : null;
        setEmailedTo(sentTo);
        if (sentTo) toast.success(t("linkSent", { email: sentTo }));
      } else {
        toast.success(t("orderCreated"));
        router.push("/dashboard/orders");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("errorCreate"));
    } finally {
      setSubmitting(false);
    }
  }

  // Garde : paiements non activés
  if (store && !store.stripeChargesEnabled) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <PageHeader title={t("title")} />
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-border">
          <p className="text-sm text-muted-foreground">
            {t("enablePaymentsHint")}
          </p>
          <Link href="/dashboard/settings" className="mt-4 inline-block">
            <Button className="h-11 rounded-2xl">{t("enablePayments")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const sectionCls = "rounded-2xl bg-white p-5 ring-1 ring-border space-y-4";

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("ordersLink")}
      </Link>
      <PageHeader title={t("title")} description={t("subtitle")} />

      {/* Articles */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold text-foreground">{t("itemsSection")}</h2>

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.uid} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    {it.kind === "custom" ? (
                      <Input
                        placeholder={t("itemNamePlaceholder")}
                        value={it.name}
                        onChange={(e) => updateItem(it.uid, { name: e.target.value })}
                      />
                    ) : (
                      <p className="truncate py-2 text-sm font-medium text-foreground">
                        {it.product.name}
                      </p>
                    )}
                  </div>
                  <div className="w-16 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t("qty")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(it.uid, { quantity: Math.max(1, Number(e.target.value)) })
                      }
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t("priceEuro", { symbol })}</Label>
                    {it.kind === "custom" ? (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.price}
                        onChange={(e) => updateItem(it.uid, { price: Number(e.target.value) })}
                      />
                    ) : (
                      <div className="flex h-10 items-center justify-end rounded-lg border border-input bg-muted/40 px-3 text-sm font-medium">
                        {formatCurrency(productItemPrice(it.product, it.selectedOptions), currency, locale)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.uid)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Sélection des variations (options du produit) */}
                {it.kind === "product" && it.product.options?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {it.product.options.map((opt) => (
                      <div key={opt.name} className="min-w-[120px] flex-1 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{opt.name}</Label>
                        <select
                          value={it.selectedOptions[opt.name] ?? ""}
                          onChange={(e) => updateProductOption(it.uid, opt.name, e.target.value)}
                          className="h-10 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
                        >
                          {opt.values.map((v) => {
                            const adj = opt.adjustments?.[v] ?? 0;
                            return (
                              <option key={v} value={v}>
                                {v}
                                {adj ? ` (+${formatCurrency(adj, currency, locale)})` : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value=""
            onChange={(e) => e.target.value && addProduct(e.target.value)}
            disabled={products.length === 0}
            className="h-11 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring disabled:opacity-50"
          >
            <option value="">
              {products.length === 0 ? t("noProductAvailable") : t("addProduct")}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.options?.length ? ` — ${t("variations")}` : ` — ${formatCurrency(p.price, currency, locale)}`}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={addCustom} className="h-11 rounded-xl">
            <Plus className="h-4 w-4" />
            {t("customLine")}
          </Button>
        </div>
      </div>

      {/* Validation / encaissement */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold text-foreground">{t("validationSection")}</h2>
        <div className="space-y-2">
          {PAYMENT_OPTIONS.map((opt) => {
            const selected = payment === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPayment(opt.value)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-border"}`}>
                  {selected && <Check className="h-3 w-3 text-white" />}
                </span>
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{t(`payment.${opt.value}.label`)}</span>
                  <span className="block text-xs text-muted-foreground">{t(`payment.${opt.value}.desc`)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode lien de paiement : email client facultatif pour envoyer le lien */}
      {!offline && (
        <div className={sectionCls}>
          <h2 className="text-base font-semibold text-foreground">{t("emailSectionTitle")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("emailSectionHint")}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="cemail-online">{t("email")}</Label>
            <Input
              id="cemail-online"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="client@exemple.com"
              className="h-11"
            />
          </div>
        </div>
      )}

      {/* Sections offline : client + réception */}
      {offline && (
        <>
          <div className={sectionCls}>
            <h2 className="text-base font-semibold text-foreground">{t("customerSection")}</h2>
            <div className="space-y-1.5">
              <Label htmlFor="cname">{t("fullName")}</Label>
              <Input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Marie Dupont" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cphone">{t("phone")}</Label>
              <Input id="cphone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cemail">{t("email")}</Label>
              <Input id="cemail" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="client@exemple.com" className="h-11" />
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className="text-base font-semibold text-foreground">{t("fulfillmentSection")}</h2>
            <div className="space-y-2">
              {methods.map((m) => {
                const selected = method === m;
                const mFee = m === "local_delivery" ? store?.localDeliveryFee ?? 0 : m === "shipping" ? shippingFeeFor(m) : 0;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                      selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-border"}`}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-foreground">{tff(m)}</span>
                    <span className="text-xs text-muted-foreground">{mFee > 0 ? `+${formatCurrency(mFee, currency, locale)}` : t("free")}</span>
                  </button>
                );
              })}
              {methods.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("noFulfillment")}</p>
              )}
            </div>

            {needsAddress && (
              <div className="space-y-1.5">
                <Label htmlFor="address">{t("address")}</Label>
                <AddressAutocomplete id="address" value={address} onChange={setAddress} onSelect={(v, d) => { setAddress(v); setDestCountry(d.countryCode); }} placeholder="12 rue des Lilas, 75011 Paris" country={method === "shipping" ? undefined : store?.country} />
                <Label htmlFor="addressComplement" className="mt-2">{t("addressComplement")}</Label>
                <Input id="addressComplement" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} placeholder="N°12, 3e étage, interphone 42…" />
              </div>
            )}
            {needsDate && (
              <div className="space-y-1.5">
                <Label htmlFor="rdate">{t("desiredDate")}</Label>
                <DatePickerField id="rdate" value={requestedDate} onChange={setRequestedDate} min={min} max={max} />
              </div>
            )}
          </div>
        </>
      )}

      {/* Note */}
      <div className={sectionCls}>
        <Label htmlFor="note">{t("noteLabel")}</Label>
        <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} />
      </div>

      {/* Total + submit */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("subtotal")}</span>
          <span className="text-sm">{formatCurrency(subtotal, currency, locale)}</span>
        </div>
        {offline && method && method !== "pickup" && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{tff(method)}</span>
            <span className="text-sm">{fee > 0 ? formatCurrency(fee, currency, locale) : t("free")}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="font-semibold text-foreground">{offline ? t("total") : t("subtotal")}</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(total, currency, locale)}</span>
        </div>
        {!offline && (
          <p className="text-xs text-muted-foreground">
            {t("shippingNote")}
          </p>
        )}
        <Button
          type="button"
          onClick={submit}
          disabled={submitting || !store?.stripeChargesEnabled}
          className="h-12 w-full rounded-2xl text-base font-semibold"
        >
          {submitting
            ? t("creating")
            : offline
            ? t("validateOrder")
            : t("createAndLink")}
        </Button>
      </div>

      {link && (
        <ManualOrderLinkDialog
          open={!!link}
          onOpenChange={(o) => !o && setLink(null)}
          link={link}
          subtotal={subtotal}
          currency={currency}
          locale={locale}
          emailedTo={emailedTo}
        />
      )}
    </div>
  );
}
