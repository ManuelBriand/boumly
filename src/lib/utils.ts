import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Devise: code ISO 4217 (accepté en minuscule à la Stripe, normalisé en MAJUSCULE
// pour Intl). Défaut EUR/fr-FR = comportement historique (rétro-compatible).
export function formatCurrency(
  amount: number,
  currency = "EUR",
  locale = "fr-FR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

// Symbole court d'une devise (ex. "€", "$", "£", "CHF") — pour les labels/adornments
// de champs de saisie. Fallback sur le code ISO si pas de symbole narrow.
export function currencySymbol(currency = "EUR", locale = "fr-FR"): string {
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency.toUpperCase();
}

// Tronque un texte à `max` caractères (ellipse incluse) — descriptions meta/OG.
export function truncate(text: string, max = 155): string {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function formatDate(date: Date | { toDate: () => Date }): string {
  const d = "toDate" in date ? date.toDate() : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | { toDate: () => Date }): string {
  const d = "toDate" in date ? date.toDate() : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
