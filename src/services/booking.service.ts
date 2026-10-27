import { cache } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { Prestation, Creneau } from "@/types";
import type { PrestationInput } from "@/lib/validations/booking";

// ─── Lectures (client SDK) ──────────────────────────────────────────

export const getPrestationBySlug = cache(
  async (slug: string): Promise<Prestation | null> => {
    const q = query(
      collection(db, "prestations"),
      where("slug", "==", slug),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Prestation;
  }
);

export async function getPrestationById(id: string): Promise<Prestation | null> {
  const snap = await getDoc(doc(db, "prestations", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Prestation;
}

export async function getPrestationsByBoutique(
  boutiqueId: string
): Promise<Prestation[]> {
  const q = query(
    collection(db, "prestations"),
    where("boutiqueId", "==", boutiqueId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Prestation))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

// Créneaux MATÉRIALISÉS d'une prestation (docs `creneaux` existants — occurrences
// réservées ou annulées). À fusionner avec les occurrences calculées côté appelant
// (cf. computeOccurrences). Tri côté client pour éviter un index composite.
export async function getSlotsByPrestation(
  prestationId: string
): Promise<Creneau[]> {
  const q = query(
    collection(db, "creneaux"),
    where("prestationId", "==", prestationId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Creneau))
    .sort((a, b) => a.dateHeure.toMillis() - b.dateHeure.toMillis());
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

export function createPrestation(
  user: FirebaseUser,
  input: PrestationInput
): Promise<{ id: string; slug: string }> {
  return authedFetch(user, "/api/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePrestation(
  user: FirebaseUser,
  prestationId: string,
  input: Partial<PrestationInput>
): Promise<{ ok: boolean }> {
  return authedFetch(user, `/api/bookings/${prestationId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function cancelSlot(
  user: FirebaseUser,
  prestationId: string,
  slotId: string
): Promise<{ ok: boolean; cancelled: number }> {
  return authedFetch(
    user,
    `/api/bookings/${prestationId}/slots/${slotId}/cancel`,
    { method: "PUT", body: "{}" }
  );
}
