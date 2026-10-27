"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useForm, type Resolver, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Truck, ShoppingBag, Package, MapPin, Check, Tag, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useBookingRange } from "@/hooks/useBookingRange";
import { getCartItemKey, getItemPrice } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import { DatePickerField } from "@/components/shared/DatePickerField";
import { InlineAuth } from "@/features/store/InlineAuth";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  makeCheckoutSchema,
  type CheckoutInput,
  type CheckoutSchemaOptions,
} from "@/lib/validations/checkout";
import { createCheckoutPaymentIntent, validatePromoCode } from "@/services/payment.service";
import { getStoreBySlug } from "@/services/store.service";
import { getLatestCustomerContact } from "@/services/order.service";
import { trackBeginCheckout, buildCartItems } from "@/lib/analytics";
import { PaymentStep } from "@/features/store/PaymentStep";
import { formatCurrency } from "@/lib/utils";
import { distanceKm } from "@/lib/geo";
import { zoneForDestination } from "@/lib/regions";
import { COUNTRIES } from "@/lib/countries";
import type { Store, FulfillmentMethod } from "@/types";

const METHOD_ICON: Record<FulfillmentMethod, typeof Truck> = {
  pickup: ShoppingBag,
  local_delivery: Truck,
  shipping: Package,
};

const STEP_KEYS = ["delivery", "details", "payment"] as const;

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { items, total, clearCart, currency, locale } = useCart();
  const { firebaseUser, user } = useAuth();
  const t = useTranslations("pay");
  const tc = useTranslations("checkout");
  const tff = useTranslations("fulfillment");
  const tv = useTranslations("checkoutValidation");
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [addrCoords, setAddrCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCountry, setDestCountry] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [payment, setPayment] = useState<{ clientSecret: string | null; orderId: string; connectedAccountId?: string } | null>(null);
  const [done, setDone] = useState(false); // paiement validé → on quitte vers la confirmation
  // ── Code promo ──
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<string | null>(null); // code appliqué
  const [discount, setDiscount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const scheduling = store?.schedulingEnabled ?? false;
  const { min, max, minISO, maxISO } = useBookingRange(store);

  // Resolver stable qui relit la config la plus récente (boutique chargée async)
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

  // Préremplir si client connecté
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

  // Store config — modes activés + frais par mode
  const pickupAddress = store?.address ?? "";

  // Palier d'expédition pour la destination courante (connu après choix d'adresse).
  const shipZone =
    store && fulfillmentMethod === "shipping" && destCountry
      ? zoneForDestination(store.country, destCountry)
      : null;
  const shipZoneCfg =
    fulfillmentMethod !== "shipping"
      ? null
      : store?.shippingZones
      ? shipZone
        ? store.shippingZones[shipZone]
        : null
      : { enabled: true, fee: store?.shippingFee ?? 0 }; // legacy : tarif plat partout
  const shipEnabled = !!shipZoneCfg?.enabled;

  const feeFor = (m: FulfillmentMethod | undefined): number => {
    if (m === "local_delivery") return store?.localDeliveryFee ?? 0;
    if (m === "shipping") return shipEnabled ? shipZoneCfg!.fee : 0;
    return 0;
  };

  // Liste des modes proposés par la boutique
  const methods: FulfillmentMethod[] = store
    ? [
        ...(store.pickupEnabled ? (["pickup"] as const) : []),
        ...(store.localDeliveryEnabled ? (["local_delivery"] as const) : []),
        ...(store.shippingEnabled ? (["shipping"] as const) : []),
      ]
    : [];

  // Load store + présélection du premier mode dispo
  useEffect(() => {
    if (!slug) return;
    getStoreBySlug(slug).then((s) => {
      setStore(s);
      if (s) {
        const first: FulfillmentMethod | undefined = s.pickupEnabled
          ? "pickup"
          : s.localDeliveryEnabled
          ? "local_delivery"
          : s.shippingEnabled
          ? "shipping"
          : undefined;
        if (first) setValue("fulfillmentMethod", first);
      }
    });
  }, [slug, setValue]);

  // Panier vide → retour boutique. Désactivé une fois le paiement validé (done),
  // sinon le clearCart final renverrait vers la boutique au lieu de la confirmation.
  useEffect(() => {
    if (items.length === 0 && !done) router.replace(`/store/${slug}`);
  }, [items.length, done, slug, router]);

  // Boutique pas encore vendable (Stripe non activé) → retour vitrine.
  // Filet de sécurité côté serveur conservé (checkout-server).
  useEffect(() => {
    if (store && store.stripeChargesEnabled !== true) router.replace(`/store/${slug}`);
  }, [store, slug, router]);

  // begin_checkout une seule fois, dès qu'il y a des articles.
  const beganCheckoutRef = useRef(false);
  useEffect(() => {
    if (!beganCheckoutRef.current && items.length > 0) {
      beganCheckoutRef.current = true;
      trackBeginCheckout(total, buildCartItems(items, getItemPrice), currency);
    }
  }, [items, total, currency]);

  if (items.length === 0 && !done) return null;

  const fee = feeFor(fulfillmentMethod);
  const grandTotal = Math.max(0, total - discount) + fee;

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await validatePromoCode({ slug, code, subtotal: total });
      if (res.valid && res.code) {
        setPromoCode(res.code);
        setDiscount(res.discount ?? 0);
        setPromoInput(res.code);
      } else {
        setPromoCode(null);
        setDiscount(0);
        setPromoError(res.error ?? tc("promoInvalid"));
      }
    } catch {
      setPromoError(tc("promoValidationError"));
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    setPromoCode(null);
    setDiscount(0);
    setPromoInput("");
    setPromoError(null);
  }
  const needsAddress =
    fulfillmentMethod === "local_delivery" || fulfillmentMethod === "shipping";
  const needsDate =
    scheduling &&
    (fulfillmentMethod === "pickup" || fulfillmentMethod === "local_delivery");
  const dateLabel = fulfillmentMethod === "pickup" ? t("pickupWord") : t("deliveryWord");

  // ── Précision d'adresse + rayon de livraison locale ────────────────
  const radiusKm = store?.localDeliveryRadiusKm ?? 0;
  const storeHasCoords =
    typeof store?.lat === "number" && typeof store?.lng === "number";
  const radiusActive =
    fulfillmentMethod === "local_delivery" && radiusKm > 0 && storeHasCoords;
  const addressTyped = (watch("address")?.trim().length ?? 0) >= 5;
  const dist =
    radiusActive && addrCoords
      ? distanceKm({ lat: store!.lat!, lng: store!.lng! }, addrCoords)
      : null;
  // Expédition non disponible pour ce pays (palier désactivé).
  const shipBlocked =
    fulfillmentMethod === "shipping" && !!addrCoords && !shipEnabled;
  const destLabel =
    COUNTRIES.find((c) => c.code === destCountry)?.label ??
    destCountry?.toUpperCase() ??
    tc("thisCountry");

  // Adresse précise requise → doit venir d'une suggestion choisie.
  // Puis : rayon (livraison locale) ou palier d'expédition.
  const addressError: string | null =
    !needsAddress || !addressTyped
      ? null
      : !addrCoords
      ? tc("selectFromSuggestions")
      : dist !== null && dist > radiusKm
      ? tc("outOfZone", { dist: dist.toFixed(1), max: radiusKm })
      : shipBlocked
      ? tc("noShippingTo", { country: destLabel })
      : null;
  // Hors zone / pays bloqué → proposer les autres modes.
  const outOfZone = (dist !== null && dist > radiusKm) || shipBlocked;
  const otherMethods = methods.filter((m) => m !== fulfillmentMethod);

  function selectMode(m: FulfillmentMethod) {
    setValue("fulfillmentMethod", m, { shouldValidate: true });
  }

  // Champs à valider par étape
  function fieldsForStep(s: number): Path<CheckoutInput>[] {
    if (s === 0)
      return [
        "fulfillmentMethod",
        ...(needsAddress ? (["address"] as const) : []),
        ...(needsDate ? (["requestedDate"] as const) : []),
      ];
    return ["customerName", "customerPhone", "customerEmail", "acceptCancellationPolicy"];
  }

  async function createPaymentIntent() {
    setLoading(true);
    try {
      const res = await createCheckoutPaymentIntent({
        slug,
        items,
        customer: getValues(),
        ...(firebaseUser ? { customerId: firebaseUser.uid } : {}),
        ...(promoCode ? { promoCode } : {}),
      });
      // Commande gratuite (total 0 €) : déjà payée serveur → confirmation directe.
      if (res.free || !res.clientSecret) {
        setDone(true);
        clearCart();
        router.push(`/store/${slug}/confirmation/${res.orderId}`);
        return;
      }
      setPayment(res);
      setStep(2);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : tc("orderError"));
    } finally {
      setLoading(false);
    }
  }

  async function next() {
    const ok = await trigger(fieldsForStep(step));
    if (!ok) return;
    if (step === 0 && addressError) {
      toast.error(addressError);
      return;
    }
    if (step === 0) setStep(1);
    else if (step === 1) await createPaymentIntent();
  }

  function goToStep(target: number) {
    if (target >= step) return; // navigation arrière uniquement
    if (target < 2) setPayment(null); // PI obsolète si on revient éditer
    setStep(target);
  }

  function onPaid() {
    setDone(true);
    router.push(`/store/${slug}/confirmation/${payment!.orderId}`);
    clearCart();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-6">
        <Link
          href={`/store/${slug}`}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToStore")}
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-foreground">
          {t("title")}
        </h1>

        <div className="space-y-6">
          {/* ── Fil d'Ariane / stepper ───────────────────────────── */}
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
                    <span
                      className={`mx-2 h-px flex-1 ${i < step ? "bg-primary/40" : "bg-border"}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* ════════ ÉTAPE 1 — LIVRAISON ════════ */}
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
                        onClick={() => selectMode(m)}
                        className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
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
                          {m === "shipping" && store?.shippingZones && !destCountry
                            ? tc("byDestination")
                            : mFee > 0
                            ? `+${formatCurrency(mFee, currency, locale)}`
                            : t("free")}
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

                {/* Pickup address (read-only) */}
                {fulfillmentMethod === "pickup" && pickupAddress && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-green-50/60 border border-green-100 p-3">
                    <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-green-800">{t("pickupAddress")}</p>
                      <p className="text-sm text-foreground whitespace-pre-line">{pickupAddress}</p>
                    </div>
                  </div>
                )}

                {/* Address fields (local_delivery + shipping) */}
                {needsAddress && (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="address">{t("address")}</Label>
                      <AddressAutocomplete
                        id="address"
                        value={watch("address") ?? ""}
                        onChange={(v) => setValue("address", v, { shouldValidate: true })}
                        onSelect={(v, d) => {
                          setValue("address", v, { shouldValidate: true });
                          setAddrCoords(d.coords);
                          setDestCountry(d.countryCode);
                        }}
                        placeholder="12 rue des Lilas, 75011 Paris"
                        ariaInvalid={!!errors.address || !!addressError}
                        country={fulfillmentMethod === "shipping" ? undefined : store?.country}
                      />
                      {errors.address && (
                        <p className="text-xs text-destructive">{tv(errors.address.message!)}</p>
                      )}
                      {!errors.address && addressError && (
                        <p className="text-xs text-destructive">{addressError}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="addressComplement">{t("addressComplement")}</Label>
                      <Input
                        id="addressComplement"
                        className="h-11"
                        placeholder="N°12, 3e étage, interphone 42…"
                        {...register("addressComplement")}
                        aria-invalid={!!errors.addressComplement}
                      />
                      {errors.addressComplement && (
                        <p className="text-xs text-destructive">{tv(errors.addressComplement.message!)}</p>
                      )}
                    </div>

                    {/* Hors zone → proposer les autres modes disponibles */}
                    {outOfZone && otherMethods.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-xs font-medium text-amber-800">
                          {tc("notDeliverable")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {otherMethods.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => selectMode(m)}
                              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                            >
                              {tff(m)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Requested date/time (pickup + local_delivery, si programmation activée) */}
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
                        placeholder={tc("chooseDate")}
                        ariaInvalid={!!errors.requestedDate}
                      />
                      {errors.requestedDate && (
                        <p className="text-xs text-destructive">{tv(errors.requestedDate.message!)}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="requestedTime">{t("time")}</Label>
                      <Input
                        id="requestedTime"
                        type="time"
                        className="h-11"
                        {...register("requestedTime")}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════ ÉTAPE 2 — COORDONNÉES ════════ */}
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
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-foreground">{t("yourDetails")}</h2>
                  <span className="text-xs text-green-600 font-medium">
                    {user?.name ? tc("connectedNamed", { name: user.name.split(" ")[0] }) : tc("connected")}
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="customerName">{t("fullName")}</Label>
                    <Input
                      id="customerName"
                      placeholder="Marie Dupont"
                      className="h-11"
                      {...register("customerName")}
                      aria-invalid={!!errors.customerName}
                    />
                    {errors.customerName && (
                      <p className="text-xs text-destructive">{tv(errors.customerName.message!)}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="customerPhone">{t("phone")}</Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      className="h-11"
                      {...register("customerPhone")}
                      aria-invalid={!!errors.customerPhone}
                    />
                    {errors.customerPhone && (
                      <p className="text-xs text-destructive">{tv(errors.customerPhone.message!)}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="customerEmail">{t("email")}</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="vous@exemple.com"
                      className="h-11 bg-muted/40"
                      readOnly
                      {...register("customerEmail")}
                      aria-invalid={!!errors.customerEmail}
                    />
                    {errors.customerEmail && (
                      <p className="text-xs text-destructive">{tv(errors.customerEmail.message!)}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="note">{t("noteLabel")}</Label>
                    <Textarea
                      id="note"
                      rows={3}
                      placeholder={tc("notePlaceholder")}
                      {...register("note")}
                      aria-invalid={!!errors.note}
                    />
                    {errors.note && (
                      <p className="text-xs text-destructive">{tv(errors.note.message!)}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                        {...register("acceptCancellationPolicy")}
                        aria-invalid={!!errors.acceptCancellationPolicy}
                      />
                      <span>
                        {tc.rich("acceptCancellation", {
                          link: (chunks) => (
                            <Link
                              href={`/store/${slug}/conditions-annulation`}
                              target="_blank"
                              className="font-medium text-primary hover:underline"
                            >
                              {chunks}
                            </Link>
                          ),
                        })}
                      </span>
                    </label>
                    {errors.acceptCancellationPolicy && (
                      <p className="text-xs text-destructive">
                        {tv(errors.acceptCancellationPolicy.message!)}
                      </p>
                    )}
                  </div>
                </div>
                </>
                )}
              </div>
            )}

            {/* ════════ ÉTAPE 3 — PAIEMENT ════════ */}
            {step === 2 && payment && payment.clientSecret && payment.connectedAccountId && (
              <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
                <h2 className="mb-4 text-base font-semibold text-foreground">{t("steps.payment")}</h2>
                <PaymentStep
                  clientSecret={payment.clientSecret}
                  connectedAccountId={payment.connectedAccountId}
                  amountLabel={formatCurrency(grandTotal, currency, locale)}
                  returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/store/${slug}/confirmation/${payment.orderId}`}
                  onSuccess={onPaid}
                />
              </div>
            )}

            {/* ── Résumé de la commande (toujours visible) ───────── */}
            <div className="rounded-2xl bg-white p-5 ring-1 ring-border">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                {t("orderSummary")}
              </h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const key = getCartItemKey(item);
                  const price = getItemPrice(item);
                  const variantLabel = item.selectedOptions
                    ? Object.values(item.selectedOptions).join(" — ")
                    : undefined;
                  return (
                    <div key={key} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">
                          {item.quantity}× {item.product.name}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(price * item.quantity, currency, locale)}
                        </span>
                      </div>
                      {variantLabel && (
                        <p className="text-xs text-muted-foreground ml-4">{variantLabel}</p>
                      )}
                      {item.customFieldValue && (
                        <p className="text-xs text-muted-foreground ml-4 italic">&quot;{item.customFieldValue}&quot;</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("subtotal")}</span>
                <span className="text-sm">{formatCurrency(total, currency, locale)}</span>
              </div>
              {fulfillmentMethod && fulfillmentMethod !== "pickup" && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {tff(fulfillmentMethod)}
                  </span>
                  <span className="text-sm">{fee > 0 ? formatCurrency(fee, currency, locale) : t("free")}</span>
                </div>
              )}

              {/* ── Code promo ── */}
              {discount > 0 && (
                <div className="mt-2 flex items-center justify-between text-emerald-600">
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <Tag className="h-3.5 w-3.5" />
                    {promoCode}
                  </span>
                  <span className="text-sm font-medium">−{formatCurrency(discount, currency, locale)}</span>
                </div>
              )}

              {step < 2 && (
                <div className="mt-3">
                  {promoCode ? (
                    <button
                      type="button"
                      onClick={removePromo}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                      {tc("removePromo")}
                    </button>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value.toUpperCase());
                            setPromoError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              applyPromo();
                            }
                          }}
                          placeholder={tc("promoPlaceholder")}
                          className="h-10 flex-1 uppercase"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={applyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                          className="h-10 rounded-xl"
                        >
                          {promoLoading ? "..." : tc("apply")}
                        </Button>
                      </div>
                      {promoError && (
                        <p className="mt-1.5 text-xs text-destructive">{promoError}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <Separator className="my-4" />
              <div className="mt-2 flex items-center justify-between">
                <span className="font-semibold text-foreground">{t("total")}</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(grandTotal, currency, locale)}
                </span>
              </div>
            </div>

            {/* ── Navigation ─────────────────────────────────────── */}
            {step < 2 && (
              <div className="flex gap-3">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goToStep(step - 1)}
                    className="h-12 rounded-2xl"
                  >
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
                    {loading
                      ? tc("preparing")
                      : step === 1
                      ? grandTotal <= 0
                        ? tc("validateFree")
                        : t("payAmount", { amount: formatCurrency(grandTotal, currency, locale) })
                      : t("continue")}
                  </Button>
                )}
              </div>
            )}
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => goToStep(1)}
                className="h-11 w-full rounded-2xl"
              >
                {t("editOrder")}
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
