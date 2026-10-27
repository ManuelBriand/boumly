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
import type { Event } from "@/types";
import type { EventInput } from "@/lib/validations/event";

// ─── Lectures (client SDK, utilisables en SSR pour les événements publiés) ──

// cache() dédoublonne le fetch au sein d'un même rendu serveur (layout + page +
// generateMetadata). Côté client, c'est un passe-plat sans effet.
export const getEventBySlug = cache(
  async (slug: string): Promise<Event | null> => {
    const q = query(collection(db, "events"), where("slug", "==", slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Event;
  }
);

export async function getEventById(id: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, "events", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Event;
}

export async function getEventByInviteCode(code: string): Promise<Event | null> {
  const q = query(
    collection(db, "events"),
    where("inviteCode", "==", code.toUpperCase()),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Event;
}

export async function getEventsByOrganizer(organizerId: string): Promise<Event[]> {
  const q = query(collection(db, "events"), where("organizerId", "==", organizerId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Event))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function getPublishedEvents(): Promise<Event[]> {
  const q = query(collection(db, "events"), where("status", "==", "published"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
}

// ─── Mutations (via routes serveur Admin SDK — slug/inviteCode/Stripe verrouillés) ─

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

export function createEvent(
  user: FirebaseUser,
  input: EventInput
): Promise<{ id: string; slug: string; inviteCode: string }> {
  return authedFetch(user, "/api/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateEvent(
  user: FirebaseUser,
  eventId: string,
  input: Partial<EventInput>
): Promise<{ ok: boolean }> {
  return authedFetch(user, `/api/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
