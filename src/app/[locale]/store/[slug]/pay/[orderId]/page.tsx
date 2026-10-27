"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useForm, type Resolver, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Truck, ShoppingBag, Package, MapPin, Check, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AccountButton } from "@/features/account/AccountButton";
import { useBookingRange } from "@/hooks/useBookingRange";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import { DatePickerField } from "@/components/shared/DatePickerField";
import { InlineAuth } from "@/features/store/InlineAuth";
import { PaymentStep } from "@/features/store/PaymentStep";
import {
  makeCheckoutSchema,
  type CheckoutInput,
  type CheckoutSchemaOptions,
} from "@/lib/validations/checkout";
import { getStoreBySlug } from "@/services/store.service";
import { getLatestCustomerContact } from "@/services/order.service";
import { getOrderDraft, finalizeManualOrderPayment, type OrderDraft } from "@/services/manual-order.service";
import { formatCurrency } from "@/lib/utils";
import { currencyForCountry } from "@/lib/countries";
import { zoneForDestination } from "@/lib/regions";
import type { Store, FulfillmentMethod } from "@/types";

const METHOD_ICON: Record<FulfillmentMethod, typeof Truck> = {
  pickup: ShoppingBag,
  local_delivery: Truck,
  shipping: Package,
};

const STEP_KEYS = ["delivery", "details", "payment"] as const;

export default function PayOrderPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const router = useRouter();
  const { firebaseUser, user } = useAuth();
  const t = useTranslations("pay");
  const tff = useTranslations("fulfillment");
  const tv = useTranslations("checkoutValidation");
  const locale = useLocale();

  const [store, setStore] = useState<Store | null>(null);
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [payment, setPayment] = useState<{ clientSecret: string; connectedAccountId: string } | null>(null);
  const [destCountry, setDestCountry] = useState<string | null>(null);

  const scheduling = store?.schedulingEnabled ?? false;
  const { min, max, minISO, maxISO } = useBookingRange(store);

  const optsRef = useRef<CheckoutSchemaOptions>({ scheduling: false });
  optsRef.current = { scheduling, minISO, maxISO };
  const resolver = useMemo<Resolver<CheckoutInput>>(
    () => (values, context, options) =>
      zodResolver(makeCheckoutSchema(optsRef.current))(values, context, options),
    []
  );

  const {
    register,
    trigger,
    getValues,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutInput>({ resolver });

  // Chargement boutique + brouillon
  useEffect(() => {
    if (!slug || !orderId) return;
    Promise.all([getStoreBySlug(slug), getOrderDraft(orderId)])
      .then(([s, d]) => {
        setStore(s);
        setDraft(d);
        if (d.note) setValue("note", d.note);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("orderNotFound"))
      );
  }, [slug, orderId, setValue, t]);

  // Préselection du 1er mode + préremplissage compte
  useEffect(() => {
    if (store) {
      const first: FulfillmentMethod | undefined = store.pickupEnabled
        ? "pickup"
        : store.localDeliveryEnabled
        ? "local_delivery"
        : store.shippingEnabled
        ? "shipping"
        : undefined;
      if (first) setValue("fulfillmentMethod", first);
    }
  }, [store, setValue]);

  useEffect(() => {
    if (firebaseUser) {
      if (user?.name) setValue("customerName", user.name);
      if (firebaseUser.email) setValue("customerEmail", firebaseUser.email);
    }
  }, [firebaseUser, user, setValue]);

  // Préremplit nom + téléphone depuis la dernière commande du client (si dispo).
  useEffect(() => {
    if (!firebaseUser) return;
    getLatestCustomerContact(firebaseUser.uid).then((c) => {
      if (!c) return;
      if (c.name && !getValues("customerName")) setValue("customerName", c.name);
      if (c.phone && !getValues("customerPhone")) setValue("customerPhone", c.phone);
    });
  }, [firebaseUser, setValue, getValues]);

  const fulfillmentMethod = watch("fulfillmentMethod");
  const pickupAddress = store?.address ?? "";
  const feeFor = (m: FulfillmentMethod | undefined): number => {
    if (m === "local_delivery") return store?.localDeliveryFee ?? 0;
    if (m === "shipping") {
      if (!store) return 0;
      if (!store.shippingZones) return store.shippingFee ?? 0; // legacy : tarif plat
      if (!destCountry) return 0; // connu après choix d'adresse
      const z = store.shippingZones[zoneForDestination(store.country, destCountry)];
      return z?.enabled ? z.fee : 0;
    }
    return 0;
  };

  const methods: FulfillmentMethod[] = store
    ? [
        ...(store.pickupEnabled ? (["pickup"] as const) : []),
        ...(store.localDeliveryEnabled ? (["local_delivery"] as const) : []),
        ...(store.shippingEnabled ? (["shipping"] as const) : []),
      ]
    : [];

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">{error}</p>
          <Link href={`/store/${slug}`} className="mt-3 inline-block text-sm text-primary underline">
            {t("backToStore")}
          </Link>
        </div>
      </div>
    );
  }

  if (!draft || !store) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  // Déjà réglée
  if (draft.paid) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-lg font-semibold text-foreground">{t("alreadyPaidTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("alreadyPaidBody")}</p>
          <Link href={`/store/${slug}/confirmation/${orderId}`}>
            <Button className="mt-5 h-11 rounded-2xl">{t("viewOrder")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const fee = feeFor(fulfillmentMethod);
  const grandTotal = draft.subtotal + fee;
  const currency = currencyForCountry(store.country);
  const needsAddress =
    fulfillmentMethod === "local_delivery" || fulfillmentMethod === "shipping";
  const needsDate =
    scheduling && (fulfillmentMethod === "pickup" || fulfillmentMethod === "local_delivery");
  const dateLabel = fulfillmentMethod === "pickup" ? t("pickupWord") : t("deliveryWord");

  function fieldsForStep(s: number): Path<CheckoutInput>[] {
    if (s === 0)
      return [
        "fulfillmentMethod",
        ...(needsAddress ? (["address"] as const) : []),
        ...(needsDate ? (["requestedDate"] as const) : []),
      ];
    return ["customerName", "customerPhone", "customerEmail"];
  }

  async function createPaymentIntent() {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const res = await finalizeManualOrderPayment(orderId, {
        customer: getValues(),
        customerId: firebaseUser.uid,
      });
      setPayment(res);
      setStep(2);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("paymentError"));
    } finally {
      setLoading(false);
    }
  }

  async function next() {
    const ok = await trigger(fieldsForStep(step));
    if (!ok) return;
    if (step === 0) setStep(1);
    else if (step === 1) await createPaymentIntent();
  }

  function goToStep(target: number) {
    if (target >= step) return;
    if (target < 2) setPayment(null);
    setStep(target);
  }

  const confirmationUrl = `/store/${slug}/confirmation/${orderId}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-4 flex justify-end">
          <AccountButton />
        </div>
        <h1 className="mb-1 text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{store.name}</p>

        <div className="space-y-6">
            {/* Stepper */}
            <ol className="flex items-center">
              {STEP_KEYS.map((key, i) => {
                const label = t(`steps.${key}`);
                const isDone = i < step;
                const isActive = i === step;
                return (
                  <li key={key} className="flex flex-1 items-center last:flex-none">
                    <button
                      type="button"
                      onClick={() => goToStep(i)}
                      disabled={i >= step}
                      className="flex items-center gap-2 disabled:cursor-default"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                          isActive
                            ? "bg-primary text-white"
                            : isDone
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isDone ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                      <span
                        className={`hidden text-sm font-medium sm:inline ${
                          isActive ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                    {i < STEP_KEYS.length - 1 && (
                      <span className={`mx-2 h-px flex-1 ${i < step ? "bg-primary/40" : "bg-border"}`} />
                    )}
                  </li>
                );
              })}
            </ol>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* ÉTAPE 1 — LIVRAISON */}
              {step === 0 && (
                <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
                  <h2 className="mb-4 text-base font-semibold text-foreground">
                    {t("howReceive")}
                  </h2>
                  <div className="space-y-2">
                    {methods.map((m) => {
                      const Icon = METHOD_ICON[m];
                      const mFee = feeFor(m);
                      const selected = fulfillmentMethod === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setValue("fulfillmentMethod", m, { shouldValidate: true })}
                          className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                            selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              selected ? "border-primary bg-primary" : "border-border"
                            }`}
                          >
                            {selected && <Check className="h-3 w-3 text-white" />}
                          </span>
                          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 text-sm font-semibold text-foreground">
                            {tff(m)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {mFee > 0 ? `+${formatCurrency(mFee, currency, locale)}` : t("free")}
                          </span>
                        </button>
                      );
                    })}
                    {methods.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        {t("noOrders")}
                      </p>
                    )}
                  </div>

                  {fulfillmentMethod === "pickup" && pickupAddress && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-green-100 bg-green-50/60 p-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <div>
                        <p className="text-xs font-semibold text-green-800">{t("pickupAddress")}</p>
                        <p className="whitespace-pre-line text-sm text-foreground">{pickupAddress}</p>
                      </div>
                    </div>
                  )}

                  {needsAddress && (
                    <div className="mt-4 space-y-1.5">
                      <Label htmlFor="address">{t("address")}</Label>
                      <AddressAutocomplete
                        id="address"
                        value={watch("address") ?? ""}
                        onChange={(v) => setValue("address", v, { shouldValidate: true })}
                        onSelect={(v, d) => {
                          setValue("address", v, { shouldValidate: true });
                          setDestCountry(d.countryCode);
                        }}
                        placeholder="12 rue des Lilas, 75011 Paris"
                        ariaInvalid={!!errors.address}
                        country={fulfillmentMethod === "shipping" ? undefined : store.country}
                      />
                      {errors.address && (
                        <p className="text-xs text-destructive">{tv(errors.address.message!)}</p>
                      )}
                      <Label htmlFor="addressComplement" className="mt-2">{t("addressComplement")}</Label>
                      <Input
                        id="addressComplement"
                        className="h-11"
                        placeholder="N°12, 3e étage, interphone 42…"
                        {...register("addressComplement")}
                      />
                    </div>
                  )}

                  {needsDate && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="requestedDate">{t("desiredDate", { type: dateLabel })}</Label>
                        <DatePickerField
                          id="requestedDate"
                          value={watch("requestedDate")}
                          onChange={(iso) => setValue("requestedDate", iso, { shouldValidate: true })}
                          min={min}
                          max={max}
                          ariaInvalid={!!errors.requestedDate}
                        />
                        {errors.requestedDate && (
                          <p className="text-xs text-destructive">{tv(errors.requestedDate.message!)}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="requestedTime">{t("time")}</Label>
                        <Input id="requestedTime" type="time" className="h-11" {...register("requestedTime")} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ÉTAPE 2 — COORDONNÉES */}
              {step === 1 && (
                <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
                  {!firebaseUser ? (
                    <>
                      <h2 className="mb-2 text-base font-semibold text-foreground">{t("loginTitle")}</h2>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {t("loginHint")}
                      </p>
                      <InlineAuth defaultOpen allowGuest={false} />
                    </>
                  ) : (
                  <>
                  <h2 className="mb-4 text-base font-semibold text-foreground">{t("yourDetails")}</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="customerName">{t("fullName")}</Label>
                      <Input id="customerName" placeholder="Marie Dupont" className="h-11" {...register("customerName")} aria-invalid={!!errors.customerName} />
                      {errors.customerName && (
                        <p className="text-xs text-destructive">{tv(errors.customerName.message!)}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="customerPhone">{t("phone")}</Label>
                      <Input id="customerPhone" type="tel" placeholder="+33 6 12 34 56 78" className="h-11" {...register("customerPhone")} aria-invalid={!!errors.customerPhone} />
                      {errors.customerPhone && (
                        <p className="text-xs text-destructive">{tv(errors.customerPhone.message!)}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="customerEmail">{t("email")}</Label>
                      <Input id="customerEmail" type="email" placeholder="vous@exemple.com" className="h-11 bg-muted/40" readOnly {...register("customerEmail")} aria-invalid={!!errors.customerEmail} />
                      {errors.customerEmail && (
                        <p className="text-xs text-destructive">{tv(errors.customerEmail.message!)}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="note">{t("noteLabel")}</Label>
                      <Textarea id="note" rows={2} placeholder={t("notePlaceholder")} {...register("note")} />
                    </div>
                  </div>
                  </>
                  )}
                </div>
              )}

              {/* ÉTAPE 3 — PAIEMENT */}
              {step === 2 && payment && (
                <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
                  <h2 className="mb-4 text-base font-semibold text-foreground">{t("steps.payment")}</h2>
                  <PaymentStep
                    clientSecret={payment.clientSecret}
                    connectedAccountId={payment.connectedAccountId}
                    amountLabel={formatCurrency(grandTotal, currency, locale)}
                    returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}${confirmationUrl}`}
                    onSuccess={() => router.push(confirmationUrl)}
                  />
                </div>
              )}

              {/* Résumé */}
              <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
                <h2 className="mb-4 text-base font-semibold text-foreground">{t("orderSummary")}</h2>
                <div className="space-y-3">
                  {draft.items.map((item, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">{item.quantity}× {item.name}</span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity, currency, locale)}</span>
                      </div>
                      {item.variantLabel && (
                        <p className="ml-4 text-xs text-muted-foreground">{item.variantLabel}</p>
                      )}
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("subtotal")}</span>
                  <span className="text-sm">{formatCurrency(draft.subtotal, currency, locale)}</span>
                </div>
                {fulfillmentMethod && fulfillmentMethod !== "pickup" && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{tff(fulfillmentMethod)}</span>
                    <span className="text-sm">{fee > 0 ? formatCurrency(fee, currency, locale) : t("free")}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-foreground">{t("total")}</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(grandTotal, currency, locale)}</span>
                </div>
              </div>

              {/* Navigation */}
              {step < 2 && (
                <div className="flex gap-3">
                  {step > 0 && (
                    <Button type="button" variant="outline" onClick={() => goToStep(step - 1)} className="h-12 rounded-2xl">
                      {t("back")}
                    </Button>
                  )}
                  {!(step === 1 && !firebaseUser) && (
                    <Button
                      type="button"
                      onClick={next}
                      disabled={loading || methods.length === 0}
                      className="h-12 flex-1 rounded-2xl text-base font-semibold"
                    >
                      {loading ? t("preparingPayment") : step === 1 ? t("payAmount", { amount: formatCurrency(grandTotal, currency, locale) }) : t("continue")}
                    </Button>
                  )}
                </div>
              )}
              {step === 2 && (
                <Button type="button" variant="outline" onClick={() => goToStep(1)} className="h-11 w-full rounded-2xl">
                  {t("editOrder")}
                </Button>
              )}
            </form>
          </div>
      </div>
    </div>
  );
}
