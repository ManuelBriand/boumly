import type { Store } from "@/types";

export const DEFAULT_MINIMUM_NOTICE_HOURS = 24;
export const DEFAULT_MAXIMUM_BOOKING_DAYS = 90;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Fenêtre de réservation autorisée.
 * min = début du jour de (maintenant + délai minimum)
 * max = début du jour (maintenant + nombre de jours max)
 */
export function getBookingRange(store?: Store | null): { min: Date; max: Date } {
  const noticeHours = store?.minimumNoticeHours ?? DEFAULT_MINIMUM_NOTICE_HOURS;
  const maxDays = store?.maximumBookingDays ?? DEFAULT_MAXIMUM_BOOKING_DAYS;
  const now = new Date();
  const min = startOfDay(new Date(now.getTime() + noticeHours * 60 * 60 * 1000));
  const max = startOfDay(now);
  max.setDate(max.getDate() + maxDays);
  return { min, max };
}

/** Date locale → "yyyy-mm-dd" (évite le décalage UTC de toISOString). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "yyyy-mm-dd" → Date à minuit local. */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export type ScheduleBucket = "today" | "tomorrow" | "upcoming" | "past";

export function getScheduleBucket(requestedDate?: string): ScheduleBucket | null {
  if (!requestedDate) return null;
  const target = startOfDay(parseISODate(requestedDate));
  const today = startOfDay(new Date());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays < 0) return "past";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return "upcoming";
}

/** "2026-06-20" → "20 juin 2026". */
export function formatRequestedDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseISODate(iso));
}
