"use client";

import { useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Plus, Trash2, MapPin, CalendarClock, Tag, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import { COUNTRIES, STRIPE_COUNTRIES, DEFAULT_COUNTRY, currencyForCountry, toMinorUnits, fromMinorUnits } from "@/lib/countries";
import { currencySymbol } from "@/lib/utils";
import { uploadEventPhoto } from "@/services/storage.service";
import { useAuth } from "@/hooks/useAuth";
import type { EventInput } from "@/lib/validations/event";
import type { Event } from "@/types";

interface FormValues {
  name: string;
  description: string;
  country: string;
  address: string;
  lat?: number;
  lng?: number;
  scheduleType: "recurring" | "oneoff";
  frequency: "weekly" | "monthly" | "custom";
  scheduleDescription: string;
  nextDates: { value: string }[];
  pricingType: "fixed" | "variable" | "both";
  fixedPrice?: number;
  categories: { name: string; price: number }[];
  capacity?: number;
  registrationOpen: boolean;
  status: "draft" | "published";
}

function tsToISO(ts: { toDate: () => Date }): string {
  return ts.toDate().toISOString().slice(0, 10);
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
      </div>
      {children}
    </div>
  );
}

export function EventForm({
  event,
  onSubmit,
  submitting,
}: {
  event?: Event;
  onSubmit: (input: EventInput) => Promise<void>;
  submitting: boolean;
}) {
  const t = useTranslations("events");
  const { firebaseUser, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState(event?.photoUrl ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const isEdit = !!event;
  const cur = event?.currency;

  const {
    register, handleSubmit, watch, setValue, control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: event?.name ?? "",
      description: event?.description ?? "",
      country: event?.country ?? user?.country ?? DEFAULT_COUNTRY,
      address: event?.address ?? "",
      lat: event?.lat,
      lng: event?.lng,
      scheduleType: event?.schedule?.type ?? "recurring",
      frequency: event?.schedule?.frequency ?? "monthly",
      scheduleDescription: event?.schedule?.description ?? "",
      nextDates: (event?.schedule?.nextDates ?? []).map((ts) => ({ value: tsToISO(ts) })),
      pricingType: event?.pricing?.type ?? "fixed",
      fixedPrice: event?.pricing?.fixedPrice != null
        ? fromMinorUnits(event.pricing.fixedPrice, cur ?? "eur")
        : undefined,
      categories: (event?.pricing?.categories ?? []).map((c) => ({
        name: c.name,
        price: fromMinorUnits(c.price, cur ?? "eur"),
      })),
      capacity: event?.capacity,
      registrationOpen: event?.registrationOpen ?? true,
      status: event?.status === "published" ? "published" : "draft",
    },
  });

  const dates = useFieldArray({ control, name: "nextDates" });
  const cats = useFieldArray({ control, name: "categories" });

  const country = watch("country") ?? DEFAULT_COUNTRY;
  // Pays figé si édition OU si le compte Connect organisateur est déjà configuré
  // (le pays du compte connecté est immuable → inutile de le redemander).
  const countryLocked = isEdit || !!user?.stripeAccountId;
  const currency = isEdit ? (cur ?? "eur") : currencyForCountry(country);
  const symbol = currencySymbol(currency);
  const scheduleType = watch("scheduleType");
  const pricingType = watch("pricingType");
  const status = watch("status");
  const registrationOpen = watch("registrationOpen");

  async function submit(v: FormValues) {
    let photoUrl = event?.photoUrl;
    if (photoFile) {
      // Dossier = uid de l'organisateur courant (les règles Storage exigent
      // request.auth.uid == {userId}). En édition, organizerId == uid courant.
      const uid = event?.organizerId ?? firebaseUser?.uid;
      if (!uid) {
        toast.error(t("photoError"));
        return;
      }
      setUploading(true);
      try {
        photoUrl = await uploadEventPhoto(uid, photoFile);
      } catch {
        toast.error(t("photoError"));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const wantsVariable = v.pricingType !== "fixed";
    const wantsFixed = v.pricingType !== "variable";

    const input: EventInput = {
      // Type figé à "market" pour l'instant (label UI reste "Marché") ; conservé
      // à l'édition. Permet d'ajouter salon/concert plus tard sans migration.
      type: event?.type ?? "market",
      name: v.name,
      description: v.description,
      ...(photoUrl && { photoUrl }),
      address: v.address,
      ...(typeof v.lat === "number" && { lat: v.lat }),
      ...(typeof v.lng === "number" && { lng: v.lng }),
      country: isEdit ? (event!.country) : v.country,
      schedule: {
        type: v.scheduleType,
        ...(v.scheduleType === "recurring" && { frequency: v.frequency }),
        nextDates: v.nextDates.map((d) => d.value).filter(Boolean),
        description: v.scheduleDescription,
      },
      pricing: {
        type: v.pricingType,
        ...(wantsFixed && typeof v.fixedPrice === "number" && {
          fixedPrice: toMinorUnits(v.fixedPrice, currency),
        }),
        ...(wantsVariable && {
          categories: v.categories
            .filter((c) => c.name.trim())
            .map((c) => ({ name: c.name.trim(), price: toMinorUnits(c.price || 0, currency) })),
        }),
      },
      ...(typeof v.capacity === "number" && { capacity: v.capacity }),
      registrationOpen: v.registrationOpen,
      status: v.status,
    };

    await onSubmit(input);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      {/* Identité */}
      <Section icon={Settings2} title={t("identityTitle")}>
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-muted hover:bg-muted/80"
          >
            {photoPreview ? (
              <Image src={photoPreview} alt={t("photoAlt")} fill className="object-cover" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => fileInputRef.current?.click()}>
            {t("changePhoto")}
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

        <div className="space-y-1.5">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" className="h-11" {...register("name", { required: true })} aria-invalid={!!errors.name} />
          {errors.name && <p className="text-xs text-destructive">{t("nameRequired")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea id="description" className="min-h-24 resize-none" {...register("description")} />
        </div>
      </Section>

      {/* Localisation */}
      <Section icon={MapPin} title={t("locationTitle")}>
        <div className="space-y-1.5">
          <Label>{t("country")}</Label>
          <Select value={country} disabled={countryLocked} onValueChange={(v) => setValue("country", v ?? DEFAULT_COUNTRY)}>
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
                <SelectItem key={c.code} value={c.code}>{c.flag} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{countryLocked ? t("countryLocked") : t("countryHint")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">{t("address")}</Label>
          <AddressAutocomplete
            id="address"
            value={watch("address") ?? ""}
            onChange={(v) => setValue("address", v)}
            onSelect={(_, d) => {
              setValue("lat", d.coords?.lat);
              setValue("lng", d.coords?.lng);
            }}
            placeholder="Place du marché, 75011 Paris"
            country={country}
          />
        </div>
      </Section>

      {/* Programmation */}
      <Section icon={CalendarClock} title={t("scheduleTitle")}>
        <div className="space-y-1.5">
          <Label>{t("scheduleType")}</Label>
          <Select value={scheduleType} onValueChange={(v) => setValue("scheduleType", v as FormValues["scheduleType"])}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recurring">{t("scheduleRecurring")}</SelectItem>
              <SelectItem value="oneoff">{t("scheduleOneoff")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {scheduleType === "recurring" && (
          <div className="space-y-1.5">
            <Label>{t("frequency")}</Label>
            <Select value={watch("frequency")} onValueChange={(v) => setValue("frequency", v as FormValues["frequency"])}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t("freqWeekly")}</SelectItem>
                <SelectItem value="monthly">{t("freqMonthly")}</SelectItem>
                <SelectItem value="custom">{t("freqCustom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="scheduleDescription">{t("scheduleDescription")}</Label>
          <Input id="scheduleDescription" className="h-11" placeholder={t("schedulePlaceholder")} {...register("scheduleDescription")} />
        </div>
        <div className="space-y-2">
          <Label>{t("nextDates")}</Label>
          {dates.fields.map((f, i) => (
            <div key={f.id} className="flex items-center gap-2">
              <Input type="date" className="h-10" {...register(`nextDates.${i}.value` as const)} />
              <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => dates.remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => dates.append({ value: "" })}>
            <Plus className="h-4 w-4 mr-1" /> {t("addDate")}
          </Button>
        </div>
      </Section>

      {/* Tarification */}
      <Section icon={Tag} title={t("pricingTitle")}>
        <div className="space-y-1.5">
          <Label>{t("pricingType")}</Label>
          <Select value={pricingType} onValueChange={(v) => setValue("pricingType", v as FormValues["pricingType"])}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">{t("pricingFixed")}</SelectItem>
              <SelectItem value="variable">{t("pricingVariable")}</SelectItem>
              <SelectItem value="both">{t("pricingBoth")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {pricingType !== "variable" && (
          <div className="space-y-1.5">
            <Label htmlFor="fixedPrice">{t("fixedPrice", { symbol })}</Label>
            <Input
              id="fixedPrice" type="number" step="0.01" min="0" className="h-11 w-40"
              {...register("fixedPrice", { setValueAs: (v) => (v === "" || v == null ? undefined : parseFloat(v)) })}
            />
          </div>
        )}
        {pricingType !== "fixed" && (
          <div className="space-y-2">
            <Label>{t("categories")}</Label>
            {cats.fields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2">
                <Input className="h-10 flex-1" placeholder={t("categoryName")} {...register(`categories.${i}.name` as const)} />
                <Input
                  type="number" step="0.01" min="0" className="h-10 w-28" placeholder={symbol}
                  {...register(`categories.${i}.price` as const, { setValueAs: (v) => (v === "" || v == null ? 0 : parseFloat(v)) })}
                />
                <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => cats.remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => cats.append({ name: "", price: 0 })}>
              <Plus className="h-4 w-4 mr-1" /> {t("addCategory")}
            </Button>
          </div>
        )}
      </Section>

      {/* Réglages */}
      <Section icon={Settings2} title={t("settingsTitle")}>
        <div className="space-y-1.5">
          <Label htmlFor="capacity">{t("capacity")}</Label>
          <Input
            id="capacity" type="number" min="0" className="h-11 w-32"
            {...register("capacity", { setValueAs: (v) => (v === "" || v == null ? undefined : parseInt(v, 10)) })}
          />
          <p className="text-xs text-muted-foreground">{t("capacityHint")}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t("registrationOpen")}</p>
            <p className="text-xs text-muted-foreground">{t("registrationOpenHint")}</p>
          </div>
          <Switch checked={registrationOpen ?? true} onCheckedChange={(v) => setValue("registrationOpen", v)} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t("publish")}</p>
            <p className="text-xs text-muted-foreground">{t("publishHint")}</p>
          </div>
          <Switch
            checked={status === "published"}
            onCheckedChange={(v) => setValue("status", v ? "published" : "draft")}
          />
        </div>
      </Section>

      <Button type="submit" className="h-12 w-full rounded-xl font-semibold" disabled={submitting || uploading}>
        {submitting || uploading ? t("saving") : isEdit ? t("save") : t("create")}
      </Button>
    </form>
  );
}
