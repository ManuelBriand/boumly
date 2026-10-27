import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { Reservation, ReservationStatut } from "@/types";

// ─── Lectures (client SDK) ──────────────────────────────────────────
// Règles : lisibles par le client (clientId) ou le créateur (boutiqueId).

export async function getReservation(id: string): Promise<Reservation | null> {
  const snap = await getDoc(doc(db, "reservations", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Reservation;
}

// Réservations d'une boutique (côté créateur). Filtre par `boutiqueId` (== uid) :
// les règles n'autorisent que le créateur ou le client → « les règles ne sont pas
// des filtres ». Tri côté client.
export async function getReservationsByBoutique(
  boutiqueId: string
): Promise<Reservation[]> {
  const q = query(
    collection(db, "reservations"),
    where("boutiqueId", "==", boutiqueId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Reservation))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

// Réservations d'un client (récap page compte). Règle : lisibles par clientId.
export async function getReservationsByClient(
  clientId: string
): Promise<Reservation[]> {
  const q = query(
    collection(db, "reservations"),
    where("clientId", "==", clientId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Reservation))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export function reservationsForPrestation(
  reservations: Reservation[],
  prestationId: string
): Reservation[] {
  return reservations.filter((r) => r.prestationId === prestationId);
}

export function filterByStatut(
  reservations: Reservation[],
  ...statuts: ReservationStatut[]
): Reservation[] {
  return reservations.filter((r) => statuts.includes(r.statut));
}

// ─── Mutations (routes serveur Admin SDK) ───────────────────────────

async function authedFetch<T>(
  user: FirebaseUser,
  path: string,
  init: RequestInit
): Promise<T> {
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur");
  return data as T;
}

// Client réserve un créneau.
export function createReservation(
  user: FirebaseUser,
  prestationId: string,
  slotId: string
): Promise<{ id: string; statut: string; needsPayment: boolean }> {
  return authedFetch(user, `/api/bookings/${prestationId}/reservations`, {
    method: "POST",
    body: JSON.stringify({ slotId }),
  });
}

// Client crée/relit le PaymentIntent pour payer sa réservation (mode immédiat).
export function createReservationPaymentIntent(
  user: FirebaseUser,
  prestationId: string,
  reservationId: string
): Promise<{ clientSecret: string; connectedAccountId: string }> {
  return authedFetch(
    user,
    `/api/bookings/${prestationId}/reservations/${reservationId}/payment-intent`,
    { method: "POST", body: "{}" }
  );
}

// Créateur annule une réservation individuelle.
export function cancelReservation(
  user: FirebaseUser,
  prestationId: string,
  reservationId: string
): Promise<{ ok: boolean }> {
  return authedFetch(
    user,
    `/api/bookings/${prestationId}/reservations/${reservationId}/cancel`,
    { method: "PUT", body: "{}" }
  );
}
