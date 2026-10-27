"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, Settings, Users, X, Ban } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { getPrestationById, getSlotsByPrestation, cancelSlot } from "@/services/booking.service";
import { getReservationsByBoutique, cancelReservation } from "@/services/reservation.service";
import { computeOccurrences } from "@/lib/occurrences";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { fromMinorUnits } from "@/lib/countries";
import { Mail, CreditCard } from "lucide-react";
import type { Prestation, Reservation, CreneauStatut } from "@/types";

// Créneau d'affichage : occurrence calculée fusionnée avec le doc matérialisé (s'il existe).
interface DisplaySlot {
  slotKey: string;
  dateHeureMs: number;
  capaciteRestante: number;
  capaciteMax: number;
  statut: CreneauStatut;
}

function formatSlot(ms: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(new Date(ms));
}

const RESA_LABEL: Record<string, string> = {
  confirmee: "Confirmée",
  en_attente: "Liste d'attente",
  payment_pending: "Paiement en attente",
  annulee_createur: "Annulée",
  terminee: "Terminée",
};

export default function AtelierOverviewPage() {
  const t = useTranslations("ateliers");
  const { prestationId } = useParams<{ prestationId: string }>();
  const { firebaseUser } = useAuth();
  const [prestation, setPrestation] = useState<Prestation | null>(null);
  const [slots, setSlots] = useState<DisplaySlot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setError(null);
    try {
      const [p, materialized, r] = await Promise.all([
        getPrestationById(prestationId),
        getSlotsByPrestation(prestationId),
        getReservationsByBoutique(firebaseUser.uid),
      ]);
      setPrestation(p);
      if (p) {
        // Occurrences calculées (règle) fusionnées avec les créneaux matérialisés.
        const mat = new Map(materialized.map((c) => [c.id, c]));
        setSlots(
          computeOccurrences(p).map((o) => {
            const c = mat.get(o.slotKey);
            return {
              slotKey: o.slotKey,
              dateHeureMs: o.dateHeureMs,
              capaciteRestante: c ? c.capaciteRestante : p.capaciteMax,
              capaciteMax: p.capaciteMax,
              statut: c ? c.statut : "ouvert",
            };
          })
        );
      }
      setReservations(r.filter((x) => x.prestationId === prestationId));
    } catch (err) {
      console.error("[atelier overview] load", err);
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, prestationId, t]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données au montage
  useEffect(() => { load(); }, [load]);

  async function onCancelReservation(id: string) {
    if (!firebaseUser) return;
    setBusy(id);
    try {
      await cancelReservation(firebaseUser, prestationId, id);
      toast.success(t("reservationCancelled"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setBusy(null);
    }
  }

  async function onCancelSlot(slotKey: string) {
    if (!firebaseUser) return;
    setBusy(slotKey);
    try {
      await cancelSlot(firebaseUser, prestationId, slotKey);
      toast.success(t("slotCancelled"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div className="p-6 lg:p-8"><Skeleton className="h-8 w-40 rounded-xl" /></div>;
  }
  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-8 space-y-4">
        <Link href="/dashboard/ateliers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Link>
        <EmptyState
          icon={<Ban className="h-7 w-7" />}
          title={t("loadError")}
          description={error}
          action={<Button className="rounded-xl" onClick={() => { setLoading(true); load(); }}>{t("retry")}</Button>}
        />
      </div>
    );
  }
  if (!prestation) {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-8 space-y-4">
        <Link href="/dashboard/ateliers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Link>
        <EmptyState icon={<Ban className="h-7 w-7" />} title={t("notFoundTitle")} description={t("notFoundBody")} />
      </div>
    );
  }

  function reservationsForSlot(slotKey: string) {
    // On n'affiche pas les paiements en ligne non confirmés (payment_pending) :
    // la place n'est pas tenue et le client n'a pas payé. Seules les réservations
    // confirmées (payées / sur place) et la liste d'attente apparaissent.
    return reservations
      .filter((r) => r.creneauId === slotKey && ["confirmee", "en_attente"].includes(r.statut))
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  }

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8 pb-24 md:pb-8 space-y-6">
      <Link href="/dashboard/ateliers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <PageHeader
        title={prestation.nom}
        description={prestation.modePaiement === "immediat" ? t("paymentOnline") : t("paymentOnsite")}
        action={
          <div className="flex gap-2">
            <Link href={`/atelier/${prestation.slug}`} target="_blank">
              <Button variant="outline" className="rounded-xl"><ExternalLink className="h-4 w-4 mr-1" /> {t("view")}</Button>
            </Link>
            <Link href={`/dashboard/ateliers/${prestationId}/settings`}>
              <Button variant="outline" className="rounded-xl"><Settings className="h-4 w-4 mr-1" /> {t("edit")}</Button>
            </Link>
          </div>
        }
      />

      {slots.length === 0 ? (
        <EmptyState icon={<Users className="h-7 w-7" />} title={t("noSlotsTitle")} description={t("noSlotsBody")} />
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const resas = reservationsForSlot(slot.slotKey);
            const cancelled = slot.statut === "annule_createur";
            return (
              <div key={slot.slotKey} className="rounded-2xl border border-border bg-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{formatSlot(slot.dateHeureMs)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("seatsLeft", { left: slot.capaciteRestante, total: slot.capaciteMax })}
                    </p>
                  </div>
                  {cancelled ? (
                    <Badge variant="outline">{t("slotStatusCancelled")}</Badge>
                  ) : (
                    <Button
                      variant="ghost" size="sm" disabled={busy === slot.slotKey}
                      className="rounded-xl text-destructive hover:text-destructive"
                      onClick={() => onCancelSlot(slot.slotKey)}
                    >
                      <Ban className="h-4 w-4 mr-1" /> {t("cancelSlot")}
                    </Button>
                  )}
                </div>

                {resas.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {resas.map((r) => {
                      const paid = !!r.paiementStripeId && r.statut === "confirmee";
                      return (
                        <div key={r.id} className="flex items-start justify-between gap-2 rounded-xl bg-muted/30 p-2.5 text-sm">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-foreground">{r.clientNom}</span>
                              <Badge variant="secondary">{RESA_LABEL[r.statut]}</Badge>
                            </div>
                            {r.clientEmail && (
                              <a href={`mailto:${r.clientEmail}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                                <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{r.clientEmail}</span>
                              </a>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                {r.amount > 0
                                  ? <><CreditCard className="h-3 w-3" /> {formatCurrency(fromMinorUnits(r.amount, r.currency), r.currency)}</>
                                  : t("free")}
                                {r.amount > 0 && (paid ? ` · ${t("paidLabel")}` : ` · ${t("unpaidLabel")}`)}
                              </span>
                              <span>{t("reservedAt", { date: formatDateTime(r.createdAt) })}</span>
                            </div>
                          </div>
                          {!cancelled && (
                            <Button
                              variant="ghost" size="icon" disabled={busy === r.id}
                              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => onCancelReservation(r.id)}
                              title={t("cancelReservation")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
