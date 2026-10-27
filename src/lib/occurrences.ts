// Calcul des occurrences (créneaux) d'un atelier — logique PURE, sans Firestore.
// Partagé serveur (booking-server) + client (dashboard) → aucune dépendance admin.
// Style Calendly/events : on ne pré-génère rien, on calcule les occurrences à la
// volée depuis la règle de la prestation. Un doc `creneaux` n'est matérialisé
// qu'à la réservation (ou l'annulation). Timezone : heure traitée en UTC (MVP).

import type { Prestation } from "@/types";

// Horizon d'affichage : jusqu'où le client peut réserver à l'avance (semaines).
export const SLOT_WEEKS = 8;

export interface Occurrence {
  slotKey: string; // "{prestationId}_{yyyy-mm-ddTHH:mm}" (UTC), déterministe
  dateHeureMs: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

// "yyyy-mm-ddTHH:mm" (heure murale) → Date UTC. null si format invalide.
export function parseWallClockUTC(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
}

// Date UTC → slotKey déterministe pour une prestation.
export function slotKeyFromDate(prestationId: string, dt: Date): string {
  const time = `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
  return `${prestationId}_${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${time}`;
}

// slotKey → Date UTC. L'id de prestation (Firestore auto-id) ne contient pas de
// "_", donc le premier "_" sépare l'id de la partie date.
export function dateFromSlotKey(slotKey: string): Date | null {
  const i = slotKey.indexOf("_");
  if (i < 0) return null;
  return parseWallClockUTC(slotKey.slice(i + 1));
}

type OccurrenceRule = Pick<
  Prestation,
  | "id" | "modeRecurrence" | "horairesRecurrence" | "datesPonctuelles"
  | "joursRecurrence" | "heureRecurrence"
>;

// Horaires hebdo effectifs : `horairesRecurrence` si présent, sinon repli sur le
// modèle legacy (joursRecurrence × heureRecurrence unique).
function effectiveHoraires(p: OccurrenceRule): { jour: number; heure: string }[] {
  if (p.horairesRecurrence?.length) return p.horairesRecurrence;
  if (p.joursRecurrence?.length && p.heureRecurrence) {
    return p.joursRecurrence.map((jour) => ({ jour, heure: p.heureRecurrence! }));
  }
  return [];
}

/**
 * Occurrences futures d'une prestation, triées par date croissante.
 * - récurrent : balaie `weeks` semaines, une occurrence par horaire hebdo dont le
 *   jour correspond (heures multiples/jour et heures différentes selon les jours).
 * - ponctuel  : datesPonctuelles futures.
 * Les dates passées sont exclues.
 */
export function computeOccurrences(
  prestation: OccurrenceRule,
  weeks = SLOT_WEEKS
): Occurrence[] {
  const out: Occurrence[] = [];
  const now = Date.now();

  if (prestation.modeRecurrence === "ponctuel") {
    for (const iso of prestation.datesPonctuelles ?? []) {
      const dt = parseWallClockUTC(iso);
      if (!dt || dt.getTime() < now) continue;
      out.push({ slotKey: slotKeyFromDate(prestation.id, dt), dateHeureMs: dt.getTime() });
    }
    return out.sort((a, b) => a.dateHeureMs - b.dateHeureMs);
  }

  // récurrent : regroupe les heures par jour de la semaine.
  const horaires = effectiveHoraires(prestation);
  if (!horaires.length) return out;
  const byDay = new Map<number, string[]>();
  for (const h of horaires) {
    const list = byDay.get(h.jour) ?? [];
    if (!list.includes(h.heure)) list.push(h.heure);
    byDay.set(h.jour, list);
  }

  const nowD = new Date();
  const startUTC = Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth(), nowD.getUTCDate());
  for (let i = 0; i < weeks * 7; i++) {
    const day = new Date(startUTC + i * 86_400_000);
    const heures = byDay.get(day.getUTCDay());
    if (!heures) continue;
    for (const heure of heures) {
      const [hh, mm] = heure.split(":").map(Number);
      const dt = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hh, mm));
      if (dt.getTime() < now) continue;
      out.push({ slotKey: slotKeyFromDate(prestation.id, dt), dateHeureMs: dt.getTime() });
    }
  }
  return out.sort((a, b) => a.dateHeureMs - b.dateHeureMs);
}
