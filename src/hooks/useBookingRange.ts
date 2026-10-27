import { useMemo } from "react";
import type { Store } from "@/types";
import { getBookingRange, toISODate } from "@/lib/scheduling";

/** Fenêtre de réservation mémoïsée pour une boutique (dates + ISO). */
export function useBookingRange(store?: Store | null) {
  // Seuls ces deux champs comptent : l'objet store change à chaque snapshot Firestore.
  const minimumNoticeHours = store?.minimumNoticeHours;
  const maximumBookingDays = store?.maximumBookingDays;
  return useMemo(() => {
    const { min, max } = getBookingRange({ minimumNoticeHours, maximumBookingDays } as Store);
    return { min, max, minISO: toISODate(min), maxISO: toISODate(max) };
  }, [minimumNoticeHours, maximumBookingDays]);
}
