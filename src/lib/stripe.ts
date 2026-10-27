import Stripe from "stripe";

// ⚠️ Serveur uniquement — ne jamais importer ce fichier dans un composant client.
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY manquant dans l'environnement");
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2026-05-27.dahlia",
  appInfo: { name: "boumly" },
});

// Commission plateforme en % (ex: 10 = 10%). Sert au calcul de l'application_fee.
export const PLATFORM_FEE_PCT = Number(process.env.STRIPE_PLATFORM_FEE_PCT ?? 10);

// Frais plateforme en plus petite unité monétaire (centimes), arrondi.
export function platformFeeAmount(totalInCents: number): number {
  return Math.round((totalInCents * PLATFORM_FEE_PCT) / 100);
}

// Commission sur les inscriptions payantes (place de stand sur un événement).
// Distincte de la commission produit : barème différent (8% par défaut).
// `STRIPE_STAND_FEE_PCT` reste lu en repli pour compat des envs existants.
export const REGISTRATION_FEE_PCT = Number(
  process.env.STRIPE_REGISTRATION_FEE_PCT ?? process.env.STRIPE_STAND_FEE_PCT ?? 8
);

export function registrationFeeAmount(totalInCents: number): number {
  return Math.round((totalInCents * REGISTRATION_FEE_PCT) / 100);
}

// Commission sur les réservations d'ateliers (prestations sur créneaux).
// Barème propre (10% par défaut), réutilise le taux plateforme en repli.
export const BOOKING_FEE_PCT = Number(
  process.env.STRIPE_BOOKING_FEE_PCT ?? PLATFORM_FEE_PCT
);

export function bookingFeeAmount(totalInCents: number): number {
  return Math.round((totalInCents * BOOKING_FEE_PCT) / 100);
}
