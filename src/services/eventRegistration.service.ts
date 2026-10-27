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
import type { EventRegistration, EventRegistrationStatus } from "@/types";

// ─── Lectures (client SDK) ──────────────────────────────────────────
// Règles : lisibles par l'artisan (userId) ou l'organisateur (organizerId).

export async function getRegistration(id: string): Promise<EventRegistration | null> {
  const snap = await getDoc(doc(db, "eventRegistrations", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as EventRegistration;
}

// Les demandes d'un événement, côté organisateur. On filtre par `organizerId`
// (== uid appelant) et non par `eventId` seul : les règles Firestore n'autorisent
// la lecture qu'au propriétaire (organizerId) ou à l'artisan (userId), et « les
// règles ne sont pas des filtres » → une requête sur `eventId` seul serait rejetée.
// Le tri + le filtre par événement se font côté client (volume dashboard modéré).
export async function getRegistrationsByEvent(
  eventId: string,
  organizerId: string
): Promise<EventRegistration[]> {
  const q = query(
    collection(db, "eventRegistrations"),
    where("organizerId", "==", organizerId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as EventRegistration))
    .filter((r) => r.eventId === eventId)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

// Demandes d'un artisan (par sa boutique) — pour le badge "Exposant au marché X".
export async function getRegistrationsByStore(
  storeId: string
): Promise<EventRegistration[]> {
  const q = query(
    collection(db, "eventRegistrations"),
    where("storeId", "==", storeId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventRegistration));
}

// Demandes de l'utilisateur connecté (suivi du statut dans /account). Filtre par
// `userId` (== uid) : la règle Firestore autorise la lecture à l'artisan (userId).
export async function getRegistrationsByUser(
  userId: string
): Promise<EventRegistration[]> {
  const q = query(
    collection(db, "eventRegistrations"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as EventRegistration))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

// Toutes les demandes reçues par un organisateur (tous ses marchés) — pour le
// résumé « Paiements ». Filtre par `organizerId` (== uid), règle Firestore OK.
export async function getRegistrationsByOrganizer(
  organizerId: string
): Promise<EventRegistration[]> {
  const q = query(
    collection(db, "eventRegistrations"),
    where("organizerId", "==", organizerId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as EventRegistration))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
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

// Artisan soumet une demande de place.
export function createRegistration(
  user: FirebaseUser,
  eventId: string,
  body: { categoryName?: string; note?: string }
): Promise<{ id: string }> {
  return authedFetch(user, `/api/events/${eventId}/registrations`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Artisan crée/relit le PaymentIntent pour payer sa place (après approbation).
export function createRegistrationPaymentIntent(
  user: FirebaseUser,
  eventId: string,
  registrationId: string
): Promise<{ clientSecret: string; connectedAccountId: string }> {
  return authedFetch(
    user,
    `/api/events/${eventId}/registrations/${registrationId}/payment-intent`,
    { method: "POST", body: "{}" }
  );
}

export function approveRegistration(
  user: FirebaseUser,
  eventId: string,
  registrationId: string
): Promise<{ ok: boolean }> {
  return authedFetch(
    user,
    `/api/events/${eventId}/registrations/${registrationId}/approve`,
    { method: "PUT", body: "{}" }
  );
}

export function rejectRegistration(
  user: FirebaseUser,
  eventId: string,
  registrationId: string,
  organizerNote?: string
): Promise<{ ok: boolean }> {
  return authedFetch(
    user,
    `/api/events/${eventId}/registrations/${registrationId}/reject`,
    { method: "PUT", body: JSON.stringify({ organizerNote }) }
  );
}

// Utilisé par les filtres de statut côté dashboard.
export function filterByStatus(
  regs: EventRegistration[],
  ...statuses: EventRegistrationStatus[]
): EventRegistration[] {
  return regs.filter((r) => statuses.includes(r.status));
}
