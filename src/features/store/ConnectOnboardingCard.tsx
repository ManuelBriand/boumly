"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { User } from "firebase/auth";
import { CreditCard, CheckCircle2, AlertCircle, Loader2, Clock, ShieldAlert, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  startConnectOnboarding,
  fetchConnectStatus,
  type ConnectStatus,
} from "@/services/connect.service";
import { StripePayoutsPanel } from "@/features/store/StripePayoutsPanel";
import type { Store } from "@/types";

/**
 * Carte d'activation Stripe Connect unifiée (fusion des ex StripeConnectCard /
 * OrganizerConnectCard / BoutiqueConnectCard). Gère les états riches
 * (loading/active/pending/contact_stripe/action_required/incomplete).
 *
 * - `target` : compte vendeur ("seller", stores/{uid}) ou organisateur ("organizer", users/{uid}).
 * - `store` : présent → hint URL boutique pendant l'onboarding + panneau Stripe embarqué quand actif.
 *   Absent (organisateur) → la page rend `StripePayoutsPanel` séparément (pas de doublon).
 * - `hideWhenActive` : ne rien rendre si le compte encaisse déjà (nudge ateliers).
 * - `onsiteNote` : ligne « paiement sur place » (ateliers).
 */
export function ConnectOnboardingCard({
  firebaseUser,
  target,
  store,
  hideWhenActive = false,
  onsiteNote = false,
}: {
  firebaseUser: User;
  target: "seller" | "organizer";
  store?: Store;
  hideWhenActive?: boolean;
  onsiteNote?: boolean;
}) {
  const params = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("connect");
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // URL publique de la boutique = adresse à donner à Stripe pendant l'onboarding
  // (site où le marchand vend, puisqu'il est merchant of record en direct charge).
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const storeUrl = store ? `${appUrl}/store/${store.slug}` : "";

  async function copyStoreUrl() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("stripeError"));
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await fetchConnectStatus(firebaseUser, target));
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, target]);

  // Charge le statut au montage + au retour de l'onboarding Stripe (?stripe=return).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données au montage
    refresh();
  }, [refresh, params]);

  async function handleOnboard() {
    setBusy(true);
    try {
      const { url } = await startConnectOnboarding(firebaseUser, locale, target);
      window.location.href = url; // redirection vers l'onboarding hébergé Stripe
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("stripeError"));
      setBusy(false);
    }
  }

  const active = status?.chargesEnabled ?? false;
  const hasAccount = status?.connected ?? !!store?.stripeAccountId;
  const state = status?.verificationState ?? "incomplete";

  // Nudge ateliers : compte déjà actif → rien à afficher.
  if (hideWhenActive && !loading && active) return null;

  // Panneau embarqué (solde/virements) dans la carte uniquement pour le vendeur
  // avec boutique ; l'organisateur affiche le panneau séparément sur sa page.
  const showPanelWhenActive = !!store;

  return (
    <div className="space-y-5">
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-violet-100">
          <CreditCard className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{t("title")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("checkingStatus")}
        </div>
      ) : active ? (
        // ── Identité vérifiée, peut encaisser ─────────────────────
        <div className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-100 p-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-2 flex-1">
            <div>
              <p className="font-medium text-green-800">{t("enabledTitle")}</p>
              <p className="text-xs text-green-700">
                {status?.payoutsEnabled
                  ? t("enabledPayouts")
                  : t("enabledPending")}
              </p>
            </div>
            {!status?.payoutsEnabled && (
              <Button
                onClick={handleOnboard}
                disabled={busy}
                variant="outline"
                size="sm"
                className="rounded-lg"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("verifyIban")}
              </Button>
            )}
          </div>
        </div>
      ) : state === "pending" ? (
        // ── En cours de vérification par Stripe ───────────────────
        <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
          <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-2 flex-1">
            <div>
              <p className="font-medium text-blue-800">{t("pendingTitle")}</p>
              <p className="text-xs text-blue-700">
                {t("pendingBody")}
              </p>
            </div>
            <Button
              onClick={refresh}
              variant="outline"
              size="sm"
              className="rounded-lg gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t("refresh")}
            </Button>
          </div>
        </div>
      ) : state === "contact_stripe" ? (
        // ── Compte restreint hors de portée du vendeur ────────────
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
          <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-red-800">{t("restrictedTitle")}</p>
            <p className="text-xs text-red-700">
              {t("restrictedBody")}{" "}
              <a
                href="https://support.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                {t("contactSupport")}
              </a>
            </p>
          </div>
        </div>
      ) : (
        // ── action_required / incomplete → onboarding à compléter ─
        <div className="space-y-3">
          {hasAccount && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                {state === "action_required"
                  ? t("actionRequiredInfo")
                  : t("incompleteInfo")}
              </p>
            </div>
          )}
          {store && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">{t("storeUrlHint")}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs text-foreground ring-1 ring-border">
                  {storeUrl}
                </code>
                <Button
                  onClick={copyStoreUrl}
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-lg gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600" /> {t("storeUrlCopied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> {t("storeUrlCopy")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          <Button onClick={handleOnboard} disabled={busy} className="w-full rounded-xl h-11">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("redirecting")}
              </>
            ) : state === "action_required" ? (
              t("completeVerification")
            ) : hasAccount ? (
              t("continueSetup")
            ) : (
              t("enablePayments")
            )}
          </Button>
          {onsiteNote && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> {t("onsiteNote")}
            </p>
          )}
        </div>
      )}
    </div>

    {/* Solde, virements à venir, gestion IBAN — composants Connect embarqués */}
    {active && showPanelWhenActive && (
      <div className="rounded-2xl border border-border bg-white p-5">
        <StripePayoutsPanel firebaseUser={firebaseUser} target={target} />
      </div>
    )}
    </div>
  );
}
