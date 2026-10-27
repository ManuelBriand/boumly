"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Settings2, CalendarClock, Tag, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/utils";
import { currencyForCountry, toMinorUnits, fromMinorUnits } from "@/lib/countries";
import { toISODate, parseISODate, formatRequestedDate } from "@/lib/scheduling";
import { uploadPrestationImage } from "@/services/storage.service";
import { useAuth } from "@/hooks/useAuth";
import type { PrestationInput } from "@/lib/validations/booking";
import type { Prestation } from "@/types";

interface FormValues {
  nom: string;
  description: string;
  dureeMinutes: number;
  capaciteMax: number;
  prix?: number;
  modePaiement: "immediat" | "sur_place";
  modeRecurrence: "recurrent" | "ponctuel";
  actif: boolean;
}

// Une date ponctuelle sélectionnée + ses heures.
interface PonctuelDate {
  date: string;      // "yyyy-mm-dd"
  heures: string[];  // ["10:00", …]
}

// prestation.datesPonctuelles ("yyyy-mm-ddTHH:mm") → regroupées par date, triées.
function initPonctuel(prestation?: Prestation): PonctuelDate[] {
  const map = new Map<string, string[]>();
  for (const iso of prestation?.datesPonctuelles ?? []) {
    const [date, heure] = iso.split("T");
    if (!date || !heure) continue;
    const list = map.get(date) ?? [];
    if (!list.includes(heure)) list.push(heure);
    map.set(date, list);
  }
  return [...map.entries()]
    .map(([date, heures]) => ({ date, heures: heures.sort() }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Jours de la semaine (0 = dimanche). Affichés Lun → Dim.
const WEEK_DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

// Horaires hebdo (ou legacy) d'une prestation → map jour → heures triées.
function initWeekly(prestation?: Prestation): Record<number, string[]> {
  const map: Record<number, string[]> = {};
  const push = (jour: number, heure: string) => {
    const list = map[jour] ?? [];
    if (!list.includes(heure)) list.push(heure);
    map[jour] = list;
  };
  if (prestation?.horairesRecurrence?.length) {
    prestation.horairesRecurrence.forEach((h) => push(h.jour, h.heure));
  } else if (prestation?.joursRecurrence?.length && prestation.heureRecurrence) {
    prestation.joursRecurrence.forEach((j) => push(j, prestation.heureRecurrence!));
  }
  Object.values(map).forEach((l) => l.sort());
  return map;
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

export function PrestationForm({
  prestation,
  onSubmit,
  submitting,
}: {
  prestation?: Prestation;
  onSubmit: (input: PrestationInput) => Promise<void>;
  submitting: boolean;
}) {
  const t = useTranslations("ateliers");
  const { firebaseUser, store } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState(prestation?.photoUrl ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  // Horaires hebdo : map jour (0–6) → liste d'heures "HH:mm". [] = jour inactif.
  const [weekly, setWeekly] = useState<Record<number, string[]>>(() => initWeekly(prestation));
  // Dates ponctuelles sélectionnées au calendrier + leurs heures.
  const [ponctuel, setPonctuel] = useState<PonctuelDate[]>(() => initPonctuel(prestation));

  const isEdit = !!prestation;
  const currency = prestation?.currency ?? currencyForCountry(store?.country);
  const symbol = currencySymbol(currency);
  const today = new Date();
  const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      nom: prestation?.nom ?? "",
      description: prestation?.description ?? "",
      dureeMinutes: prestation?.dureeMinutes ?? 60,
      capaciteMax: prestation?.capaciteMax ?? 1,
      prix: prestation?.prix != null ? fromMinorUnits(prestation.prix, currency) : undefined,
      modePaiement: prestation?.modePaiement ?? "sur_place",
      modeRecurrence: prestation?.modeRecurrence ?? "recurrent",
      actif: prestation?.actif ?? true,
    },
  });

  const modePaiement = watch("modePaiement");
  const modeRecurrence = watch("modeRecurrence");
  const actif = watch("actif");

  // ─── Dates ponctuelles (calendrier) ───────────────────────────────
  function togglePonctuelDate(d: Date) {
    const iso = toISODate(d);
    setPonctuel((prev) => {
      if (prev.some((p) => p.date === iso)) return prev.filter((p) => p.date !== iso);
      return [...prev, { date: iso, heures: ["10:00"] }].sort((a, b) => a.date.localeCompare(b.date));
    });
  }
  function addPonctuelTime(date: string) {
    setPonctuel((prev) => prev.map((p) => (p.date === date ? { ...p, heures: [...p.heures, "10:00"] } : p)));
  }
  function setPonctuelTime(date: string, idx: number, heure: string) {
    setPonctuel((prev) =>
      prev.map((p) => {
        if (p.date !== date) return p;
        const heures = [...p.heures];
        heures[idx] = heure;
        return { ...p, heures };
      })
    );
  }
  function removePonctuelTime(date: string, idx: number) {
    setPonctuel((prev) =>
      prev
        .map((p) => (p.date === date ? { ...p, heures: p.heures.filter((_, i) => i !== idx) } : p))
        .filter((p) => p.heures.length > 0)
    );
  }

  // Active/désactive un jour (ajoute une 1re heure par défaut, ou vide le jour).
  function toggleDay(jour: number) {
    setWeekly((prev) => {
      const has = (prev[jour] ?? []).length > 0;
      return { ...prev, [jour]: has ? [] : ["10:00"] };
    });
  }
  function addTime(jour: number) {
    setWeekly((prev) => ({ ...prev, [jour]: [...(prev[jour] ?? []), "10:00"] }));
  }
  function setTime(jour: number, idx: number, heure: string) {
    setWeekly((prev) => {
      const list = [...(prev[jour] ?? [])];
      list[idx] = heure;
      return { ...prev, [jour]: list };
    });
  }
  function removeTime(jour: number, idx: number) {
    setWeekly((prev) => {
      const list = (prev[jour] ?? []).filter((_, i) => i !== idx);
      return { ...prev, [jour]: list };
    });
  }

  async function submit(v: FormValues) {
    const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

    // Dates ponctuelles aplaties "yyyy-mm-ddTHH:mm" (heures valides, dédupliquées).
    const dates = [
      ...new Set(
        ponctuel.flatMap((p) =>
          p.heures.filter((h) => HHMM.test(h)).map((h) => `${p.date}T${h}`)
        )
      ),
    ];

    // Horaires hebdo aplatis (dédupliqués, heures valides).
    const horaires = Object.entries(weekly).flatMap(([jour, heures]) =>
      (heures ?? [])
        .filter((h) => HHMM.test(h))
        .map((heure) => ({ jour: Number(jour), heure }))
    );

    if (v.modeRecurrence === "recurrent" && horaires.length === 0) {
      toast.error(t("horairesRequired"));
      return;
    }
    if (v.modeRecurrence === "ponctuel" && dates.length === 0) {
      toast.error(t("datesRequired"));
      return;
    }

    let photoUrl = prestation?.photoUrl;
    if (photoFile) {
      const uid = prestation?.boutiqueId ?? firebaseUser?.uid;
      if (!uid) {
        toast.error(t("photoError"));
        return;
      }
      setUploading(true);
      try {
        photoUrl = await uploadPrestationImage(uid, photoFile);
      } catch {
        toast.error(t("photoError"));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const base = {
      nom: v.nom,
      description: v.description,
      ...(photoUrl && { photoUrl }),
      dureeMinutes: Number(v.dureeMinutes),
      capaciteMax: Number(v.capaciteMax),
      prix: toMinorUnits(v.prix || 0, currency),
      modePaiement: v.modePaiement,
      actif: v.actif,
    };

    const input: PrestationInput =
      v.modeRecurrence === "recurrent"
        ? { ...base, modeRecurrence: "recurrent", horairesRecurrence: horaires }
        : { ...base, modeRecurrence: "ponctuel", datesPonctuelles: dates };

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
          <Label htmlFor="nom">{t("name")}</Label>
          <Input id="nom" className="h-11" {...register("nom", { required: true })} aria-invalid={!!errors.nom} />
          {errors.nom && <p className="text-xs text-destructive">{t("nameRequired")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea id="description" className="min-h-24 resize-none" {...register("description")} />
        </div>
        <div className="flex gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dureeMinutes">{t("duration")}</Label>
            <Input id="dureeMinutes" type="number" min="1" className="h-11 w-32" {...register("dureeMinutes", { valueAsNumber: true })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capaciteMax">{t("capacity")}</Label>
            <Input id="capaciteMax" type="number" min="1" className="h-11 w-32" {...register("capaciteMax", { valueAsNumber: true })} />
          </div>
        </div>
      </Section>

      {/* Récurrence */}
      <Section icon={CalendarClock} title={t("scheduleTitle")}>
        <div className="space-y-1.5">
          <Label>{t("recurrenceType")}</Label>
          <Select value={modeRecurrence} onValueChange={(v) => setValue("modeRecurrence", v as FormValues["modeRecurrence"])}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recurrent">{t("recurrent")}</SelectItem>
              <SelectItem value="ponctuel">{t("ponctuel")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {modeRecurrence === "recurrent" ? t("recurrentHint") : t("ponctuelHint")}
          </p>
        </div>

        {modeRecurrence === "recurrent" ? (
          <div className="space-y-2">
            <Label>{t("weeklyHoursTitle")}</Label>
            <div className="divide-y divide-border rounded-xl border border-border">
              {WEEK_DAYS.map((d) => {
                const heures = weekly[d.value] ?? [];
                const on = heures.length > 0;
                return (
                  <div key={d.value} className="flex items-start gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={cn(
                        "mt-0.5 h-9 w-24 shrink-0 rounded-lg border text-sm font-medium transition-colors",
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {d.label}
                    </button>
                    {on ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        {heures.map((h, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Input
                              type="time"
                              value={h}
                              onChange={(e) => setTime(d.value, i, e.target.value)}
                              className="h-9 w-28"
                            />
                            <Button
                              type="button" variant="ghost" size="icon"
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => removeTime(d.value, i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button" variant="outline" size="sm" className="h-9 rounded-lg"
                          onClick={() => addTime(d.value)}
                        >
                          <Plus className="h-4 w-4 mr-1" /> {t("addTime")}
                        </Button>
                      </div>
                    ) : (
                      <span className="mt-2 text-xs text-muted-foreground">{t("dayOff")}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t("weeklyHoursHint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Label>{t("ponctuelDates")}</Label>
            <div className="flex justify-center rounded-xl border border-border p-3">
              <Calendar
                selectedDates={ponctuel.map((p) => parseISODate(p.date))}
                onToggleDate={togglePonctuelDate}
                minDate={today}
                maxDate={maxDate}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("ponctuelCalendarHint")}</p>

            {ponctuel.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noDateSelected")}</p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border">
                {ponctuel.map((p) => (
                  <div key={p.date} className="flex items-start gap-3 p-3">
                    <span className="mt-2 w-32 shrink-0 text-sm font-medium capitalize text-foreground">
                      {formatRequestedDate(p.date)}
                    </span>
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {p.heures.map((h, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Input
                            type="time"
                            value={h}
                            onChange={(e) => setPonctuelTime(p.date, i, e.target.value)}
                            className="h-9 w-28"
                          />
                          <Button
                            type="button" variant="ghost" size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                            onClick={() => removePonctuelTime(p.date, i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button" variant="outline" size="sm" className="h-9 rounded-lg"
                        onClick={() => addPonctuelTime(p.date)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> {t("addTime")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Tarification + paiement */}
      <Section icon={Tag} title={t("pricingTitle")}>
        <div className="space-y-1.5">
          <Label htmlFor="prix">{t("price", { symbol })}</Label>
          <Input
            id="prix" type="number" step="0.01" min="0" className="h-11 w-40"
            {...register("prix", { setValueAs: (v) => (v === "" || v == null ? undefined : parseFloat(v)) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("paymentMode")}</Label>
          <Select value={modePaiement} onValueChange={(v) => setValue("modePaiement", v as FormValues["modePaiement"])}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sur_place">{t("paymentOnsite")}</SelectItem>
              <SelectItem value="immediat">{t("paymentOnline")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {modePaiement === "immediat" ? t("paymentOnlineHint") : t("paymentOnsiteHint")}
          </p>
        </div>
      </Section>

      {/* Réglages */}
      <Section icon={Settings2} title={t("settingsTitle")}>
        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t("active")}</p>
            <p className="text-xs text-muted-foreground">{t("activeHint")}</p>
          </div>
          <Switch checked={actif ?? true} onCheckedChange={(v) => setValue("actif", v)} />
        </div>
      </Section>

      <Button type="submit" className="h-12 w-full rounded-xl font-semibold" disabled={submitting || uploading}>
        {submitting || uploading ? t("saving") : isEdit ? t("save") : t("create")}
      </Button>
    </form>
  );
}
