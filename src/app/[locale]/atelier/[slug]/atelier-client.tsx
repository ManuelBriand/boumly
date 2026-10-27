"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CheckCircle2, Clock, Loader2, CreditCard, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InlineAuth } from "@/features/store/InlineAuth";
import { PaymentStep } from "@/features/store/PaymentStep";
import { AccountButton } from "@/features/account/AccountButton";
import { StoreHeader, type StoreHeaderData } from "@/features/store/StoreHeader";
import { MarketBadges } from "@/features/store/MarketBadges";
import type { ExhibitorEventBadge } from "@/lib/event-server";
import {
  createReservation,
  createReservationPaymentIntent,
  getReservation,
} from "@/services/reservation.service";

interface SlotData {
  id: string;
  dateHeureMs: number;
  capaciteRestante: number;
}

interface PrestationData {
  id: string;
  slug: string;
  nom: string;
  description: string;
  photoUrl: string;
  currency: string;
  modePaiement: "immediat" | "sur_place";
  prix: number;
  dureeMinutes: number;
  priceLabel: string;
  slots: SlotData[];
}

function formatSlot(ms: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(new Date(ms));
}

interface StoreContext {
  slug: string;
  header: StoreHeaderData;
}

function Shell({
  prestation,
  store,
  exhibitorEvents,
  children,
}: {
  prestation: PrestationData;
  store: StoreContext | null;
  exhibitorEvents: ExhibitorEventBadge[];
  children: React.ReactNode;
}) {
  const t = useTranslations("ateliers");
  const online = prestation.modePaiement === "immediat";
  return (
    <>
      {store && (
        // Contexte boutique : header cliquable (retour boutique) + chips marchés.
        // StoreHeader embarque déjà son AccountButton → pas de doublon dans le main.
        <>
          <StoreHeader store={store.header} href={`/store/${store.slug}`} />
          <MarketBadges events={exhibitorEvents} />
        </>
      )}
      <main className="relative mx-auto max-w-md p-4 sm:p-6 space-y-6">
        {!store && <AccountButton className="absolute right-4 top-4 z-10" />}
      <div className="relative h-44 w-full overflow-hidden rounded-3xl bg-muted">
        {prestation.photoUrl ? (
          <Image src={prestation.photoUrl} alt={prestation.nom} fill priority className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🎨</div>
        )}
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{prestation.nom}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{prestation.priceLabel}</Badge>
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" /> {t("minutes", { count: prestation.dureeMinutes })}
          </Badge>
          <Badge variant={online ? "default" : "outline"}>
            {online ? (
              <><CreditCard className="mr-1 h-3 w-3" /> {t("paymentOnline")}</>
            ) : (
              <><MapPin className="mr-1 h-3 w-3" /> {t("paymentOnsite")}</>
            )}
          </Badge>
        </div>
        {prestation.description && (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{prestation.description}</p>
        )}
      </div>
      {children}
      </main>
    </>
  );
}

export function AtelierClient({
  prestation,
  store,
  exhibitorEvents = [],
}: {
  prestation: PrestationData;
  store?: StoreContext | null;
  exhibitorEvents?: ExhibitorEventBadge[];
}) {
  const params = useSearchParams();
  const resaId = params.get("resa");

  if (resaId) {
    return (
      <Shell prestation={prestation} store={store ?? null} exhibitorEvents={exhibitorEvents}>
        <PayMode prestation={prestation} reservationId={resaId} />
      </Shell>
    );
  }
  return (
    <Shell prestation={prestation} store={store ?? null} exhibitorEvents={exhibitorEvents}>
      <BookFlow prestation={prestation} />
    </Shell>
  );
}

// ─── Réservation ────────────────────────────────────────────────────
function BookFlow({ prestation }: { prestation: PrestationData }) {
  const t = useTranslations("ateliers");
  const { firebaseUser, loading } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; statut: string; needsPayment: boolean } | null>(null);

  async function reserve() {
    if (!firebaseUser || !selected) return;
    setSubmitting(true);
    try {
      const r = await createReservation(firebaseUser, prestation.id, selected);
      setResult(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    if (result.needsPayment) {
      return <PayMode prestation={prestation} reservationId={result.id} />;
    }
    if (result.statut === "en_attente") {
      return (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-center space-y-2">
          <Clock className="mx-auto h-8 w-8 text-amber-600" />
          <p className="font-semibold text-amber-800">{t("waitlistTitle")}</p>
          <p className="text-sm text-amber-700">{t("waitlistBody")}</p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center space-y-2">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
        <p className="font-semibold text-green-800">{t("confirmedTitle")}</p>
        <p className="text-sm text-green-700">{t("confirmedBody")}</p>
      </div>
    );
  }

  if (prestation.slots.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noSlotsPublic")}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">{t("chooseSlot")}</p>
      <div className="space-y-2">
        {prestation.slots.map((slot) => {
          const full = slot.capaciteRestante <= 0;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelected(slot.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors",
                selected === slot.id ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-muted/40"
              )}
            >
              <span className="text-sm font-medium text-foreground capitalize">{formatSlot(slot.dateHeureMs)}</span>
              <span className="text-xs text-muted-foreground">
                {full ? t("slotFull") : t("seatsLeftShort", { count: slot.capaciteRestante })}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : !firebaseUser ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("authPrompt")}</p>
          <InlineAuth defaultOpen allowGuest={false} />
        </div>
      ) : (
        <Button onClick={reserve} disabled={!selected || submitting} className="h-12 w-full rounded-xl font-semibold">
          {submitting ? t("reserving") : t("reserve")}
        </Button>
      )}
    </div>
  );
}

// ─── Paiement (mode immédiat / promotion liste d'attente) ───────────
function PayMode({ prestation, reservationId }: { prestation: PrestationData; reservationId: string }) {
  const t = useTranslations("ateliers");
  const { firebaseUser, loading } = useAuth();
  const [pay, setPay] = useState<{ clientSecret: string; connectedAccountId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [ready, setReady] = useState(false);

  const init = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const r = await getReservation(reservationId);
      if (!r) { setError(t("resaNotFound")); return; }
      if (r.statut === "confirmee") { setPaid(true); return; }
      if (r.statut !== "payment_pending") { setError(t("notPayable")); return; }
      const intent = await createReservationPaymentIntent(firebaseUser, prestation.id, reservationId);
      setPay(intent);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setReady(true);
    }
  }, [firebaseUser, reservationId, prestation.id, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données au montage
    if (!loading && firebaseUser) init();
  }, [loading, firebaseUser, init]);

  if (loading || (!ready && firebaseUser)) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (!firebaseUser) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("authPrompt")}</p>
        <InlineAuth defaultOpen allowGuest={false} />
      </div>
    );
  }
  if (paid) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center space-y-2">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
        <p className="font-semibold text-green-800">{t("confirmedTitle")}</p>
        <p className="text-sm text-green-700">{t("confirmedBody")}</p>
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!pay) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      <p className="text-sm text-muted-foreground">{t("payPrompt")}</p>
      <p className="text-lg font-bold text-foreground">{prestation.priceLabel}</p>
      <PaymentStep
        clientSecret={pay.clientSecret}
        connectedAccountId={pay.connectedAccountId}
        amountLabel={prestation.priceLabel}
        returnUrl={typeof window !== "undefined" ? window.location.href : ""}
        onSuccess={() => setPaid(true)}
      />
    </div>
  );
}
