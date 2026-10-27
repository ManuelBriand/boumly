import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { HttpError } from "@/lib/server-auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Locale Stripe (Accounts v2) + préfixe de routing par langue de l'app.
type AppLocale = "fr" | "en";
const STRIPE_LOCALE = {
  fr: "fr-FR",
  en: "en-US",
} as const;
function normalizeLocale(locale?: string): AppLocale {
  return locale === "en" ? "en" : "fr";
}

// Le compte connecté vit soit sur stores/{uid} (vendeur), soit sur users/{uid}
// (organisateur — un seul compte KYC partagé entre tous ses marchés).
export type ConnectCollection = "stores" | "users";

function targetRef(collection: ConnectCollection, uid: string) {
  return adminDb.collection(collection).doc(uid);
}

/**
 * Compte connecté unifié : un utilisateur n'a qu'UN compte Stripe, réutilisé pour
 * sa boutique ET ses événements. Un vendeur (doc stores/{uid}) réutilise le compte
 * de sa boutique ; un organisateur sans boutique a un compte dédié sur users/{uid}.
 * Évite un 2e onboarding/KYC pour un vendeur qui organise aussi des événements.
 */
export async function resolveEventConnectCollection(
  uid: string
): Promise<ConnectCollection> {
  const storeSnap = await adminDb.collection("stores").doc(uid).get();
  return storeSnap.exists ? "stores" : "users";
}

/**
 * Récupère (ou crée) le compte connecté Stripe du vendeur ou de l'organisateur.
 * Compte Accounts v2, config "merchant" (encaisse les direct charges, le marchand
 * est merchant of record). losses_collector="stripe" → Stripe couvre les soldes
 * négatifs (risque hors plateforme). fees_collector="stripe" → le marchand paie les
 * frais Stripe. dashboard="none" : pas de dashboard Stripe séparé, tout passe par
 * les composants embarqués de l'app (express interdit dès que losses=stripe).
 */
export async function ensureConnectedAccount(
  uid: string,
  opts: { locale?: string; collection?: ConnectCollection } = {}
): Promise<string> {
  const collection = opts.collection ?? "stores";
  const ref = targetRef(collection, uid);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpError(404, collection === "stores" ? "Boutique introuvable" : "Compte introuvable");
  }
  const data = snap.data() as Record<string, unknown>;

  if (typeof data.stripeAccountId === "string") return data.stripeAccountId;

  // Le pays détermine le pays du compte connecté (immuable) + la devise de
  // règlement. Obligatoire avant la création : sans lui, Stripe créerait le
  // compte dans le pays de la plateforme → versements impossibles pour le marchand.
  const country = typeof data.country === "string" ? data.country.trim() : "";
  if (!country) {
    throw new HttpError(400, "Pays requis avant l'activation des paiements");
  }

  // Plateforme FR + config merchant : AUCUNE info d'identité/profil (display_name,
  // contact_email…) ne peut être posée en clair sur create — account_token_required
  // (DSP2). Comme losses_collector="stripe" → Stripe collecte le KYC : on crée la
  // coquille minimale (pays + config + capabilities) et l'onboarding hébergé
  // récupère identité, nom et email (Stripe gère les tokens en interne).
  const account = await stripe.v2.core.accounts.create({
    dashboard: "none",
    defaults: {
      locales: [STRIPE_LOCALE[normalizeLocale(opts.locale)]],
      responsibilities: {
        // Marchand paie les frais Stripe et Stripe assume les pertes (soldes
        // négatifs) — modèle direct charge, risque hors plateforme.
        fees_collector: "stripe",
        losses_collector: "stripe",
      },
    },
    identity: { country },
    configuration: {
      merchant: {
        capabilities: {
          // Autorise l'encaissement de paiements par carte (direct charge).
          card_payments: { requested: true },
        },
      },
    },
    metadata:
      collection === "stores"
        ? { storeId: uid, ownerId: uid }
        : { organizerId: uid },
  });

  await ref.update({ stripeAccountId: account.id });
  return account.id;
}

/**
 * Crée un lien d'onboarding hébergé Stripe (KYC + RIB). À usage unique.
 * `returnPath` : chemin relatif (sans préfixe de langue) vers lequel revenir —
 * `/dashboard/settings` (vendeur) ou `/dashboard/events` (organisateur).
 */
export async function createOnboardingLink(
  accountId: string,
  opts: { locale?: string; returnPath?: string } = {}
): Promise<string> {
  const lang = normalizeLocale(opts.locale);
  const path = opts.returnPath ?? "/dashboard/settings";
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        refresh_url: `${APP_URL}/${lang}${path}?stripe=refresh`,
        return_url: `${APP_URL}/${lang}${path}?stripe=return`,
      },
    },
  });
  return link.url;
}

export type VerificationState =
  | "verified" // card_payments actif → peut encaisser
  | "pending" // identité/infos en cours de revue par Stripe
  | "action_required" // le vendeur doit fournir des informations
  | "contact_stripe" // compte restreint, hors de portée du vendeur
  | "incomplete"; // compte créé mais onboarding non terminé

export interface AccountStatus {
  chargesEnabled: boolean; // peut encaisser (card_payments actif)
  payoutsEnabled: boolean; // peut être viré sur son compte bancaire
  verificationState: VerificationState;
  requirementsDue: number; // nb de requirements actifs à traiter
}

// Forme minimale d'un status_detail de capability Accounts v2.
type StatusDetail = {
  code?: string;
  resolution?: string;
};

// Mappe une capability (status + status_details) vers l'état le plus bloquant.
// Retourne null si la capability est active (aucun blocage).
function stateFromDetails(
  status: string | undefined,
  details: StatusDetail[] | undefined
): VerificationState | null {
  if (status === "active") return null;
  const codes = (details ?? []).map((d) => d.code);
  const resolutions = (details ?? []).map((d) => d.resolution);

  if (resolutions.includes("provide_info") || codes.includes("requirements_past_due")) {
    return "action_required";
  }
  if (status === "pending" || codes.includes("requirements_pending_verification")) {
    return "pending";
  }
  if (resolutions.includes("contact_stripe") || codes.includes("restricted_other")) {
    return "contact_stripe";
  }
  return "incomplete";
}

// Sévérité pour choisir l'état le plus prioritaire entre plusieurs capabilities.
const STATE_SEVERITY: Record<VerificationState, number> = {
  action_required: 4,
  contact_stripe: 3,
  pending: 2,
  incomplete: 1,
  verified: 0,
};

/** Relit le statut Stripe et persiste sur le doc cible (boutique ou utilisateur). */
export async function refreshAccountStatus(
  uid: string,
  accountId: string,
  collection: ConnectCollection = "stores"
): Promise<AccountStatus> {
  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.merchant", "requirements"],
  });
  const caps = account.configuration?.merchant?.capabilities;
  const cardPayments = caps?.card_payments;
  const payouts = caps?.stripe_balance?.payouts;

  const chargesEnabled = cardPayments?.status === "active";
  const payoutsEnabled = payouts?.status === "active";
  const requirementsDue = account.requirements?.entries?.length ?? 0;

  let verificationState: VerificationState;
  if (chargesEnabled) {
    verificationState = "verified";
  } else {
    // Prend l'état le plus bloquant entre card_payments et payouts.
    const candidates = [
      stateFromDetails(cardPayments?.status, cardPayments?.status_details),
      stateFromDetails(payouts?.status, payouts?.status_details),
    ].filter((s): s is VerificationState => s !== null);
    verificationState = candidates.reduce<VerificationState>(
      (worst, s) => (STATE_SEVERITY[s] > STATE_SEVERITY[worst] ? s : worst),
      "incomplete"
    );
  }

  await targetRef(collection, uid).update({
    stripeChargesEnabled: chargesEnabled,
    stripePayoutsEnabled: payoutsEnabled,
    stripeVerificationState: verificationState,
  });
  return { chargesEnabled, payoutsEnabled, verificationState, requirementsDue };
}
