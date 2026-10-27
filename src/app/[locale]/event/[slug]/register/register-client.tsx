"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CheckCircle2, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InlineAuth } from "@/features/store/InlineAuth";
import { PaymentStep } from "@/features/store/PaymentStep";
import { AccountButton } from "@/features/account/AccountButton";
import { formatCurrency } from "@/lib/utils";
import { fromMinorUnits, DEFAULT_COUNTRY } from "@/lib/countries";
import { createStore } from "@/services/store.service";
import { createRegistration, createRegistrationPaymentIntent, getRegistration } from "@/services/eventRegistration.service";
import type { EventRegistration } from "@/types";

interface EventData {
  id: string;
  slug: string;
  name: string;
  description: string;
  photoUrl: string;
  country?: string;
  currency: string;
  registrationOpen: boolean;
  pricing: {
    type: "fixed" | "variable" | "both";
    fixedPrice?: number;
    categories?: { name: string; price: number }[];
  };
}

function Shell({ event, children }: { event: EventData; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md p-6 space-y-6">
      <div className="flex justify-end">
        <AccountButton />
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
          {event.photoUrl ? (
            <Image src={event.photoUrl} alt={event.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">🛒</div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{event.name}</h1>
          <Link href={`/event/${event.slug}`} className="text-sm text-primary hover:underline">
            {event.name}
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}

export function RegisterClient({ event }: { event: EventData }) {
  const t = useTranslations("eventRegister");
  const params = useSearchParams();
  const regId = params.get("reg");
  const { firebaseUser, store, loading, refreshStore } = useAuth();

  // ─── Mode paiement (?reg=) ────────────────────────────────────────
  if (regId) {
    return (
      <Shell event={event}>
        <PaymentMode event={event} registrationId={regId} />
      </Shell>
    );
  }

  // ─── Mode demande ─────────────────────────────────────────────────
  if (loading) {
    return <Shell event={event}><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Shell>;
  }

  if (!event.registrationOpen) {
    return <Shell event={event}><p className="text-sm text-muted-foreground">{t("closed")}</p></Shell>;
  }

  if (!firebaseUser) {
    return (
      <Shell event={event}>
        <p className="text-sm text-muted-foreground">{t("authPrompt")}</p>
        <InlineAuth defaultOpen allowGuest={false} />
      </Shell>
    );
  }

  // Pas de boutique → profil créateur léger (nom + activité + description) créé
  // en même temps que la demande, puis redirection vers /account (suivi statut).
  if (!store) {
    return (
      <Shell event={event}>
        <CreatorRequestForm event={event} refreshStore={refreshStore} />
      </Shell>
    );
  }

  return (
    <Shell event={event}>
      <RequestForm event={event} />
    </Shell>
  );
}

// ─── Nouveau créateur : profil boutique + demande en une étape ──────
function CreatorRequestForm({
  event,
  refreshStore,
}: {
  event: EventData;
  refreshStore: () => Promise<void>;
}) {
  const t = useTranslations("eventRegister");
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [storeName, setStoreName] = useState("");
  const [activity, setActivity] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const needsCategory = event.pricing.type !== "fixed" && (event.pricing.categories?.length ?? 0) > 0;

  function priceLabel(cents: number) {
    return formatCurrency(fromMinorUnits(cents, event.currency), event.currency);
  }

  async function submit() {
    if (!firebaseUser) return;
    if (storeName.trim().length < 2) {
      toast.error(t("storeNameRequired"));
      return;
    }
    if (needsCategory && event.pricing.type === "variable" && !categoryName) {
      toast.error(t("chooseCategory"));
      return;
    }
    setSubmitting(true);
    try {
      await createStore(firebaseUser.uid, storeName.trim(), event.country ?? DEFAULT_COUNTRY, {
        activity,
        description,
      });
      // La demande passe par le serveur (Admin SDK lit stores/{uid} déjà créé) : pas
      // besoin de rafraîchir le store client avant. On rafraîchit APRÈS la redirection
      // pour éviter que RegisterClient ne bascule sur RequestForm (flash d'écran).
      await createRegistration(firebaseUser, event.id, {
        categoryName: categoryName || undefined,
      });
      router.push("/account");
      void refreshStore();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      <div className="space-y-1 text-center">
        <Store className="mx-auto h-8 w-8 text-primary" />
        <p className="font-semibold text-foreground">{t("becomeCreatorTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("becomeCreatorSubtitle")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="store-name">{t("storeName")}</Label>
        <Input
          id="store-name"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder={t("storeNamePlaceholder")}
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="activity">{t("activity")}</Label>
        <Input
          id="activity"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder={t("activityPlaceholder")}
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-24"
          placeholder={t("descriptionPlaceholder")}
        />
      </div>

      {needsCategory && (
        <div className="space-y-1.5">
          <Label>{t("category")}</Label>
          <Select value={categoryName} onValueChange={(v) => setCategoryName(v ?? "")}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={t("chooseCategory")} /></SelectTrigger>
            <SelectContent>
              {event.pricing.categories!.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name} — {priceLabel(c.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button onClick={submit} disabled={submitting} className="h-12 w-full rounded-xl font-semibold">
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}

// ─── Formulaire de demande ──────────────────────────────────────────
function RequestForm({ event }: { event: EventData }) {
  const t = useTranslations("eventRegister");
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [categoryName, setCategoryName] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsCategory = event.pricing.type !== "fixed" && (event.pricing.categories?.length ?? 0) > 0;

  function priceLabel(cents: number) {
    return formatCurrency(fromMinorUnits(cents, event.currency), event.currency);
  }

  async function submit() {
    if (!firebaseUser) return;
    if (needsCategory && event.pricing.type === "variable" && !categoryName) {
      toast.error(t("chooseCategory"));
      return;
    }
    setSubmitting(true);
    try {
      await createRegistration(firebaseUser, event.id, {
        categoryName: categoryName || undefined,
        note: note || undefined,
      });
      router.push("/account");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}

      {event.pricing.type === "fixed" && event.pricing.fixedPrice != null && (
        <p className="text-sm font-medium text-foreground">
          {t("standPrice")} : {priceLabel(event.pricing.fixedPrice)}
        </p>
      )}

      {needsCategory && (
        <div className="space-y-1.5">
          <Label>{t("category")}</Label>
          <Select value={categoryName} onValueChange={(v) => setCategoryName(v ?? "")}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={t("chooseCategory")} /></SelectTrigger>
            <SelectContent>
              {event.pricing.categories!.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name} — {priceLabel(c.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="note">{t("note")}</Label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-24" placeholder={t("notePlaceholder")} />
      </div>

      <Button onClick={submit} disabled={submitting} className="h-12 w-full rounded-xl font-semibold">
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}

// ─── Mode paiement (place approuvée) ────────────────────────────────
function PaymentMode({ event, registrationId }: { event: EventData; registrationId: string }) {
  const t = useTranslations("eventRegister");
  const { firebaseUser, loading } = useAuth();
  const [reg, setReg] = useState<EventRegistration | null>(null);
  const [pay, setPay] = useState<{ clientSecret: string; connectedAccountId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [ready, setReady] = useState(false);

  const init = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const r = await getRegistration(registrationId);
      setReg(r);
      if (!r) { setError(t("regNotFound")); return; }
      if (r.status === "paid") { setPaid(true); return; }
      if (r.status !== "payment_pending") { setError(t("notPayable")); return; }
      const intent = await createRegistrationPaymentIntent(firebaseUser, event.id, registrationId);
      setPay(intent);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setReady(true);
    }
  }, [firebaseUser, registrationId, event.id, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données au montage
    if (!loading && firebaseUser) init();
  }, [loading, firebaseUser, init]);

  if (loading || (!ready && firebaseUser)) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (!firebaseUser) {
    return (
      <>
        <p className="text-sm text-muted-foreground">{t("authPrompt")}</p>
        <InlineAuth defaultOpen allowGuest={false} />
      </>
    );
  }
  if (paid) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center space-y-2">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
        <p className="font-semibold text-green-800">{t("paidTitle")}</p>
        <p className="text-sm text-green-700">{t("paidBody")}</p>
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!pay || !reg) return null;

  const amountLabel = formatCurrency(fromMinorUnits(reg.amount, reg.currency), reg.currency);

  return (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      <p className="text-sm text-muted-foreground">{t("payPrompt")}</p>
      <p className="text-lg font-bold text-foreground">{amountLabel}</p>
      <PaymentStep
        clientSecret={pay.clientSecret}
        connectedAccountId={pay.connectedAccountId}
        amountLabel={amountLabel}
        returnUrl={typeof window !== "undefined" ? window.location.href : ""}
        onSuccess={() => setPaid(true)}
      />
    </div>
  );
}
