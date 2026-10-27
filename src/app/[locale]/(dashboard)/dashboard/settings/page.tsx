"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Upload, Store, Phone, Truck, ShoppingBag, Package, CalendarClock, Share2, Copy, Check, CreditCard, Power, FileText,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import { COUNTRIES, STRIPE_COUNTRIES, DEFAULT_COUNTRY, currencyForCountry } from "@/lib/countries";
import { currencySymbol } from "@/lib/utils";
import { regionalLabel } from "@/lib/regions";
import { StoreSettingsSchema, type StoreSettingsInput } from "@/lib/validations/settings";
import { DEFAULT_CANCELLATION_POLICY } from "@/lib/cancellation-policy";
import { updateStore, updateStorePhoto } from "@/services/store.service";
import { uploadStorePhoto } from "@/services/storage.service";
import { SOCIAL_PLATFORMS } from "@/components/shared/socials";
import { StoreShareDialog } from "@/features/store/StoreShareDialog";
import { Link } from "@/i18n/navigation";
import type { FulfillmentMethod } from "@/types";

// ─── Section card ─────────────────────────────────────────────────
function Section({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function StorePage() {
  const { store, firebaseUser, refreshStore } = useAuth();
  const t = useTranslations("settings");
  const tv = useTranslations("settingsValidation");
  const tc = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("boutique");
  const deliveryReviewMarked = useRef(false);

  // Deep-link ?tab= (lu côté client pour éviter la déopt de prerender d'useSearchParams)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tab");
    if (
      param === "contact" ||
      param === "reception" ||
      param === "boutique" ||
      param === "paiements"
    ) {
      setTab(param);
    }
  }, []);

  // Étape onboarding : marquer la livraison comme revue dès l'ouverture de l'onglet.
  useEffect(() => {
    if (tab !== "reception" || !store) return;
    if (store.onboarding?.deliveryReviewed || deliveryReviewMarked.current) return;
    deliveryReviewMarked.current = true;
    updateStore(store.id, {
      onboarding: { ...store.onboarding, deliveryReviewed: true },
    })
      .then(refreshStore)
      .catch(() => {
        deliveryReviewMarked.current = false;
      });
  }, [tab, store, refreshStore]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<StoreSettingsInput>({
    resolver: zodResolver(StoreSettingsSchema),
  });

  const temporarilyClosed = watch("temporarilyClosed");
  const pickupEnabled = watch("pickupEnabled");
  const localDeliveryEnabled = watch("localDeliveryEnabled");
  const shippingEnabled = watch("shippingEnabled");
  const schedulingEnabled = watch("schedulingEnabled");
  const country = watch("country") ?? DEFAULT_COUNTRY;
  // Symbole devise dérivé du pays sélectionné (maj en direct si on change de pays).
  const symbol = currencySymbol(currencyForCountry(country));
  // Pays verrouillé dès qu'un compte connecté Stripe existe (pays immuable côté Stripe).
  const countryLocked = !!store?.stripeAccountId;

  useEffect(() => {
    if (store) {
      reset({
        name: store.name,
        description: store.description,
        country: store.country ?? DEFAULT_COUNTRY,
        address: store.address ?? "",
        lat: store.lat,
        lng: store.lng,
        phone: store.phone ?? "",
        email: store.email ?? "",
        temporarilyClosed: store.temporarilyClosed ?? false,
        pickupEnabled: store.pickupEnabled ?? true,
        localDeliveryEnabled: store.localDeliveryEnabled ?? false,
        localDeliveryFee: store.localDeliveryFee ?? 0,
        localDeliveryRadiusKm: store.localDeliveryRadiusKm ?? 0,
        shippingEnabled: store.shippingEnabled ?? false,
        shippingFee: store.shippingFee ?? 0,
        shippingZones: {
          national: store.shippingZones?.national ?? {
            enabled: store.shippingEnabled ?? false,
            fee: store.shippingFee ?? 0,
          },
          regional: store.shippingZones?.regional ?? { enabled: false, fee: 0 },
          international: store.shippingZones?.international ?? { enabled: false, fee: 0 },
        },
        schedulingEnabled: store.schedulingEnabled ?? true,
        minimumNoticeHours: store.minimumNoticeHours ?? 24,
        maximumBookingDays: store.maximumBookingDays ?? 90,
        cancellationPolicy: store.cancellationPolicy ?? "",
        socials: {
          instagram: store.socials?.instagram ?? "",
          tiktok: store.socials?.tiktok ?? "",
          facebook: store.socials?.facebook ?? "",
          whatsapp: store.socials?.whatsapp ?? "",
          website: store.socials?.website ?? "",
        },
      });
      setPhotoPreview(store.photoUrl);
    }
  }, [store, reset]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleCopyLink() {
    if (!store) return;
    const url = `${window.location.origin}/store/${store.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  }

  async function onSubmit(data: StoreSettingsInput) {
    if (!store || !firebaseUser) return;
    setSaving(true);
    try {
      if (photoFile) {
        const photoUrl = await uploadStorePhoto(firebaseUser.uid, photoFile);
        await updateStorePhoto(store.id, photoUrl);
      }
      const fulfillmentMethods: FulfillmentMethod[] = [
        ...(data.pickupEnabled ? (["pickup"] as const) : []),
        ...(data.localDeliveryEnabled ? (["local_delivery"] as const) : []),
        ...(data.shippingEnabled ? (["shipping"] as const) : []),
      ];
      // Pays figé après l'activation Stripe (pays du compte connecté immuable) —
      // on ne l'écrase jamais pour éviter un décalage devise présentation/règlement.
      const { country: _country, ...rest } = data;
      const payload = countryLocked ? rest : data;
      await updateStore(store.id, { ...payload, fulfillmentMethods });
      await refreshStore();
      toast.success(t("saved"));
      setPhotoFile(null);
    } catch (err) {
      console.error("[settings] save échoué", err);
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (!store) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6 lg:p-8 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {t("subtitle")}
      </p>

      {/* ── Store header + public link ──────────────────────────── */}
      <div className="mt-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-border">
            {photoPreview ? (
              <Image src={photoPreview} alt={store.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl">🛍️</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground truncate">{store.name}</p>
            {(store.address ?? store.city) && (
              <p className="text-xs text-muted-foreground truncate">{store.address ?? store.city}</p>
            )}
          </div>
        </div>

        {/* Public link */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-xl bg-white border border-border px-3 py-2.5">
            <p className="text-xs text-muted-foreground truncate font-mono">
              /store/{store.slug}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="shrink-0 h-10 px-3 rounded-xl bg-white border border-border hover:bg-muted transition-colors flex items-center gap-1.5 text-sm font-medium"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? tc("copied") : tc("copy")}</span>
          </button>
          <StoreShareDialog
            store={store}
            trigger={
              <button
                type="button"
                className="shrink-0 h-10 px-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1.5 text-sm font-medium"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">{tc("share")}</span>
              </button>
            }
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="boutique" className="gap-1.5">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabStore")}</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabContact")}</span>
            </TabsTrigger>
            <TabsTrigger value="reception" className="gap-1.5">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">{t("tabDelivery")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="boutique" keepMounted className="mt-5 space-y-5">
        {/* ── Identité ──────────────────────────────────────────── */}
        <Section
          icon={Store}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          title={t("identityTitle")}
          subtitle={t("identitySubtitle")}
        >
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-muted transition-colors hover:bg-muted/80"
            >
              {photoPreview ? (
                <Image src={photoPreview} alt={t("storePhotoAlt")} fill className="object-cover" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("changePhoto")}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">{t("photoFormats")}</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          <div className="space-y-1.5">
            <Label htmlFor="name">{t("storeName")}</Label>
            <Input id="name" className="h-11" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{tv(errors.name.message!)}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              placeholder={t("descriptionPlaceholder")}
              className="min-h-24 resize-none"
              {...register("description")}
            />
          </div>
        </Section>

        {/* ── Réseaux sociaux ───────────────────────────────────── */}
        <Section
          icon={Share2}
          iconBg="bg-pink-50"
          iconColor="text-pink-500"
          title={t("socialsTitle")}
          subtitle={t("socialsSubtitle")}
        >
          {SOCIAL_PLATFORMS.map(({ key, label, placeholder, icon: Icon }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`social-${key}`}>{label}</Label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id={`social-${key}`}
                  placeholder={placeholder}
                  className="h-11 pl-9"
                  {...register(`socials.${key}` as const)}
                />
              </div>
            </div>
          ))}
        </Section>

        {/* ── Conditions d'annulation ───────────────────────────── */}
        <Section
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          title={t("cancellationPolicy")}
          subtitle={t("cancellationPolicyHint")}
        >
          <Textarea
            id="cancellationPolicy"
            placeholder={DEFAULT_CANCELLATION_POLICY}
            className="min-h-28 resize-none"
            {...register("cancellationPolicy")}
          />
        </Section>

        {/* ── Disponibilité ─────────────────────────────────────── */}
        <Section
          icon={Power}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          title={t("availabilityTitle")}
          subtitle={t("availabilitySubtitle")}
        >
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Power className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("temporaryClosure")}</p>
                <p className="text-xs text-muted-foreground">{t("temporaryClosureHint")}</p>
              </div>
              <Switch
                checked={temporarilyClosed ?? false}
                onCheckedChange={(v) => setValue("temporarilyClosed", v, { shouldDirty: true })}
              />
            </div>
            {temporarilyClosed && (
              <div className="px-4 pb-3 border-t border-border pt-3">
                <p className="text-xs text-orange-600 font-medium">{t("closedWarning")}</p>
              </div>
            )}
          </div>
        </Section>

          </TabsContent>

          <TabsContent value="contact" keepMounted className="mt-5 space-y-5">
        {/* ── Contact ───────────────────────────────────────────── */}
        <Section
          icon={Phone}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          title={t("contactTitle")}
          subtitle={t("contactSubtitle")}
        >
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+33 6 12 34 56 78"
              className="h-11"
              {...register("phone")}
            />
            <p className="text-xs text-muted-foreground">
              {t("phoneHint")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@maboutique.com"
              className="h-11"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive">{tv(errors.email.message!)}</p>}
            <p className="text-xs text-muted-foreground">
              {t("emailHint")}
            </p>
          </div>
        </Section>

          </TabsContent>

          <TabsContent value="reception" keepMounted className="mt-5 space-y-5">
        {/* ── Modes de réception ────────────────────────────────── */}
        <Section
          icon={Truck}
          iconBg="bg-green-50"
          iconColor="text-green-500"
          title={t("fulfillmentTitle")}
          subtitle={t("fulfillmentSubtitle")}
        >
          {/* Country (pays d'activité : devise + versements) */}
          <div className="space-y-1.5">
            <Label>{t("countryLabel")}</Label>
            <Select
              value={country}
              disabled={countryLocked}
              onValueChange={(v) => setValue("country", v ?? DEFAULT_COUNTRY, { shouldDirty: true })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue>
                  {(val) => {
                    const c = COUNTRIES.find((x) => x.code === val);
                    return c ? `${c.flag} ${c.label}` : t("chooseCountry");
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STRIPE_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {countryLocked ? t("countryLockedHint") : t("countryHint")}
            </p>
          </div>

          {/* Store address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">{t("storeAddress")}</Label>
            <AddressAutocomplete
              id="address"
              value={watch("address") ?? ""}
              onChange={(v) => setValue("address", v, { shouldDirty: true })}
              onSelect={(_, d) => {
                setValue("lat", d.coords?.lat, { shouldDirty: true });
                setValue("lng", d.coords?.lng, { shouldDirty: true });
              }}
              placeholder="12 rue des Lilas, 75011 Paris"
              country={country}
            />
            <p className="text-xs text-muted-foreground">
              {t("storeAddressHint")}
            </p>
          </div>

          {/* Pickup */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("pickupTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("pickupHint")}</p>
              </div>
              <Switch
                checked={pickupEnabled ?? false}
                onCheckedChange={(v) => setValue("pickupEnabled", v, { shouldDirty: true })}
              />
            </div>
          </div>

          {/* Local delivery */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Truck className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("localDeliveryTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("localDeliveryHint")}</p>
              </div>
              <Switch
                checked={localDeliveryEnabled ?? false}
                onCheckedChange={(v) => setValue("localDeliveryEnabled", v, { shouldDirty: true })}
              />
            </div>
            {localDeliveryEnabled && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="localDeliveryFee">{t("deliveryFee", { symbol })}</Label>
                  <Input
                    id="localDeliveryFee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="h-10 w-32"
                    {...register("localDeliveryFee", {
                      setValueAs: (v) => (v === "" || v === null ? 0 : parseFloat(v) || 0),
                    })}
                  />
                  <p className="text-xs text-muted-foreground">{t("deliveryFeeHint")}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="localDeliveryRadiusKm">{t("deliveryRadius")}</Label>
                  <Input
                    id="localDeliveryRadiusKm"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    className="h-10 w-32"
                    {...register("localDeliveryRadiusKm", {
                      setValueAs: (v) => (v === "" || v === null ? 0 : parseFloat(v) || 0),
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("deliveryRadiusHint")}
                  </p>
                  {(watch("localDeliveryRadiusKm") ?? 0) > 0 &&
                    (watch("lat") == null || watch("lng") == null) && (
                      <p className="text-xs text-amber-600">
                        {t("radiusAddressWarning")}
                      </p>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Shipping */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("shippingTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("shippingHint")}</p>
              </div>
              <Switch
                checked={shippingEnabled ?? false}
                onCheckedChange={(v) => setValue("shippingEnabled", v, { shouldDirty: true })}
              />
            </div>
            {shippingEnabled && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {t("shippingZonesHint")}
                </p>
                {([
                  { key: "national" as const, label: t("zoneNational", { country: COUNTRIES.find((c) => c.code === country)?.label ?? country }) },
                  { key: "regional" as const, label: t("zoneRegional", { region: regionalLabel(country) }) },
                  { key: "international" as const, label: t("zoneInternational") },
                ]).map(({ key, label }) => {
                  const enabled = watch(`shippingZones.${key}.enabled`) ?? false;
                  return (
                    <div key={key} className="rounded-lg border border-border px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) =>
                            setValue(`shippingZones.${key}.enabled`, v, { shouldDirty: true })
                          }
                        />
                      </div>
                      {enabled && (
                        <div className="mt-2 flex items-center gap-2">
                          <Label htmlFor={`ship-${key}`} className="text-xs text-muted-foreground">
                            {t("feeEuro", { symbol })}
                          </Label>
                          <Input
                            id={`ship-${key}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            className="h-9 w-28"
                            {...register(`shippingZones.${key}.fee`, {
                              setValueAs: (v) => (v === "" || v === null ? 0 : parseFloat(v) || 0),
                            })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!pickupEnabled && !localDeliveryEnabled && !shippingEnabled && (
            <p className="text-xs text-orange-600 font-medium">
              {t("noMethodWarning")}
            </p>
          )}
        </Section>

        {/* ── Commandes programmées ─────────────────────────────── */}
        <Section
          icon={CalendarClock}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          title={t("schedulingTitle")}
          subtitle={t("schedulingSubtitle")}
        >
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <CalendarClock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("enableScheduling")}</p>
                <p className="text-xs text-muted-foreground">{t("enableSchedulingHint")}</p>
              </div>
              <Switch
                checked={schedulingEnabled ?? true}
                onCheckedChange={(v) => setValue("schedulingEnabled", v, { shouldDirty: true })}
              />
            </div>
            {schedulingEnabled && (
              <div className="px-4 pb-4 border-t border-border pt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="minimumNoticeHours">{t("minNotice")}</Label>
                  <Input
                    id="minimumNoticeHours"
                    type="number"
                    min="0"
                    placeholder="24"
                    className="h-10"
                    {...register("minimumNoticeHours", {
                      setValueAs: (v) => (v === "" || v === null ? 0 : parseInt(v, 10) || 0),
                    })}
                  />
                  <p className="text-xs text-muted-foreground">{t("minNoticeHint")}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maximumBookingDays">{t("maxBooking")}</Label>
                  <Input
                    id="maximumBookingDays"
                    type="number"
                    min="1"
                    placeholder="90"
                    className="h-10"
                    {...register("maximumBookingDays", {
                      setValueAs: (v) => (v === "" || v === null ? 1 : parseInt(v, 10) || 1),
                    })}
                  />
                  <p className="text-xs text-muted-foreground">{t("maxBookingHint")}</p>
                </div>
              </div>
            )}
          </div>
        </Section>

          </TabsContent>
        </Tabs>

        {/* Les paiements ont leur section dédiée (compte unique boutique/marchés/ateliers). */}
        <Link
          href="/dashboard/payments"
          className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-white p-4 transition-shadow hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <CreditCard className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{t("managePaymentsTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("managePaymentsSub")}</p>
          </div>
          <span className="text-muted-foreground">→</span>
        </Link>

        {/* Save button — in-flow */}
        <Button
          type="submit"
          className="mt-6 h-12 w-full rounded-xl font-semibold"
          disabled={saving || (!isDirty && !photoFile)}
        >
          {saving ? t("saving") : t("save")}
        </Button>
      </form>
    </div>
  );
}
