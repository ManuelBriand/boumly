import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { HttpError } from "@/lib/server-auth";
import { stripe, registrationFeeAmount } from "@/lib/stripe";
import { generateSlug } from "@/lib/utils";
import { currencyForCountry, fromMinorUnits } from "@/lib/countries";
import type { EventInput } from "@/lib/validations/event";
import type { Event } from "@/types";

// ─── Lectures publiques côté serveur (Admin SDK) ────────────────────
// Les pages publiques (event/[slug], register, join) sont rendues côté serveur
// sans session Firebase → le SDK client y est NON authentifié et les règles
// Firestore rejettent toute requête non contrainte par `status==published`
// (« rules are not filters »). On lit donc via l'Admin SDK (bypass règles) ; la
// visibilité (published) est contrôlée par le code appelant.
export async function getEventBySlugServer(slug: string): Promise<Event | null> {
  const snap = await adminDb
    .collection("events")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Event;
}

export async function getEventByInviteCodeServer(code: string): Promise<Event | null> {
  const snap = await adminDb
    .collection("events")
    .where("inviteCode", "==", code.toUpperCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Event;
}

const INVITE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomInviteCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
}

// Code d'invitation unique : 8 chars [A-Z0-9], vérifié en base avant usage.
async function uniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomInviteCode();
    const snap = await adminDb
      .collection("events")
      .where("inviteCode", "==", code)
      .limit(1)
      .get();
    if (snap.empty) return code;
  }
  throw new HttpError(500, "Impossible de générer un code d'invitation");
}

// Slug unique : base = slug du nom, suffixe -2, -3… en cas de collision.
async function uniqueSlug(name: string): Promise<string> {
  const base = generateSlug(name) || "event";
  let slug = base;
  let n = 1;
  // boucle bornée pour éviter une boucle infinie sur un cas pathologique
  while (n < 50) {
    const snap = await adminDb
      .collection("events")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
  throw new HttpError(500, "Impossible de générer un slug");
}

// Convertit les dates ISO (yyyy-mm-dd) du formulaire en Timestamp Admin.
function toTimestamps(dates: string[]): Timestamp[] {
  return dates
    .filter(Boolean)
    .map((d) => Timestamp.fromDate(new Date(d)))
    .filter((t) => !Number.isNaN(t.toMillis()));
}

// Construit le bloc schedule/pricing nettoyé (pas de champs undefined → Firestore).
function buildSchedule(input: EventInput["schedule"]) {
  return {
    type: input.type,
    ...(input.frequency && { frequency: input.frequency }),
    nextDates: toTimestamps(input.nextDates ?? []),
    description: input.description ?? "",
  };
}

function buildPricing(input: EventInput["pricing"]) {
  return {
    type: input.type,
    ...(typeof input.fixedPrice === "number" && { fixedPrice: input.fixedPrice }),
    ...(input.categories && input.categories.length > 0 && {
      categories: input.categories,
    }),
  };
}

/**
 * Crée un événement pour l'organisateur `uid`. Génère slug + inviteCode uniques,
 * fige la devise depuis le pays, et recopie le statut Connect de l'organisateur
 * (miroir) depuis users/{uid} pour des lectures rapides côté page publique.
 * Renseigne aussi users/{uid}.country s'il est absent : ce pays devient celui du
 * compte Connect organisateur (découplé de l'ancienne activation de rôle).
 */
export async function createEventDoc(uid: string, input: EventInput) {
  const [slug, inviteCode, userSnap, storeSnap] = await Promise.all([
    uniqueSlug(input.name),
    uniqueInviteCode(),
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("stores").doc(uid).get(),
  ]);

  const userData = userSnap.data() ?? {};
  // Compte connecté unifié : un vendeur réutilise le compte de sa boutique,
  // sinon le compte dédié organisateur sur users/{uid} (cf. resolveEventConnectCollection).
  const account =
    storeSnap.exists && typeof storeSnap.data()?.stripeAccountId === "string"
      ? storeSnap.data()!
      : userData;
  const currency = currencyForCountry(input.country);
  const ref = adminDb.collection("events").doc();

  const data = {
    id: ref.id,
    slug,
    type: input.type ?? "market",
    organizerId: uid,
    name: input.name,
    description: input.description ?? "",
    photoUrl: input.photoUrl ?? "",
    address: input.address ?? "",
    ...(typeof input.lat === "number" && { lat: input.lat }),
    ...(typeof input.lng === "number" && { lng: input.lng }),
    country: input.country,
    schedule: buildSchedule(input.schedule),
    pricing: buildPricing(input.pricing),
    currency,
    ...(typeof input.capacity === "number" && { capacity: input.capacity }),
    registrationOpen: input.registrationOpen ?? true,
    inviteCode,
    status: input.status ?? "draft",
    // Miroir Connect organisateur (compte unifié boutique/événements).
    ...(typeof account.stripeAccountId === "string" && {
      stripeAccountId: account.stripeAccountId,
    }),
    stripeChargesEnabled: account.stripeChargesEnabled === true,
    stripePayoutsEnabled: account.stripePayoutsEnabled === true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(data);

  // Découplage rôle : fige le pays organisateur au 1er événement s'il n'existe
  // pas encore (requis avant l'onboarding Connect organisateur, cf. connect.ts).
  if (!userData.country && input.country) {
    await adminDb
      .collection("users")
      .doc(uid)
      .set({ country: input.country }, { merge: true });
  }

  return { id: ref.id, slug, inviteCode };
}

/** Met à jour un événement. Vérifie la propriété. slug/inviteCode/Connect non modifiables. */
export async function updateEventDoc(
  uid: string,
  eventId: string,
  input: Partial<EventInput>
) {
  const ref = adminDb.collection("events").doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Marché introuvable");
  if (snap.data()?.organizerId !== uid) throw new HttpError(403, "Accès refusé");

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.photoUrl !== undefined) update.photoUrl = input.photoUrl;
  if (input.address !== undefined) update.address = input.address;
  if (typeof input.lat === "number") update.lat = input.lat;
  if (typeof input.lng === "number") update.lng = input.lng;
  if (input.schedule) update.schedule = buildSchedule(input.schedule);
  if (input.pricing) update.pricing = buildPricing(input.pricing);
  if (typeof input.capacity === "number") update.capacity = input.capacity;
  if (input.registrationOpen !== undefined) update.registrationOpen = input.registrationOpen;
  if (input.status !== undefined) update.status = input.status;
  // country reste figé après création (fige la devise) — non modifiable ici.

  await ref.update(update);
  return { ok: true };
}

// Charge une demande + son événement, en vérifiant que `uid` est bien l'organisateur.
// Renvoie aussi l'email/nom de l'artisan (doc users) pour les notifications.
export async function loadRegistrationForOrganizer(
  uid: string,
  eventId: string,
  registrationId: string
) {
  const regRef = adminDb.collection("eventRegistrations").doc(registrationId);
  const regSnap = await regRef.get();
  if (!regSnap.exists) throw new HttpError(404, "Demande introuvable");
  const registration = regSnap.data()!;

  if (registration.eventId !== eventId) throw new HttpError(400, "Demande hors marché");
  if (registration.organizerId !== uid) throw new HttpError(403, "Accès refusé");

  const [eventSnap, artisanSnap] = await Promise.all([
    adminDb.collection("events").doc(eventId).get(),
    adminDb.collection("users").doc(registration.userId as string).get(),
  ]);
  if (!eventSnap.exists) throw new HttpError(404, "Marché introuvable");

  const artisan = artisanSnap.data() ?? {};
  return {
    regRef,
    registration,
    event: eventSnap.data()!,
    artisanEmail: artisan.email as string | undefined,
    artisanName: (artisan.name ?? artisan.storeName ?? "Artisan") as string,
  };
}

export interface ExhibitorSummary {
  storeId: string;
  name: string;
  slug: string;
  photoUrl: string;
}

/**
 * Exposants confirmés (demandes payées) d'un événement, avec les infos publiques
 * de leur boutique. Lecture serveur (Admin SDK) : les règles Firestore interdisent
 * la lecture des registrations au public, donc la page publique passe par ici.
 */
export async function getPaidExhibitors(eventId: string): Promise<ExhibitorSummary[]> {
  const regSnap = await adminDb
    .collection("eventRegistrations")
    .where("eventId", "==", eventId)
    .where("status", "==", "paid")
    .get();

  const storeIds = [...new Set(regSnap.docs.map((d) => d.data().storeId as string))];
  const stores = await Promise.all(
    storeIds.map(async (id) => {
      const s = await adminDb.collection("stores").doc(id).get();
      if (!s.exists) return null;
      const data = s.data()!;
      return {
        storeId: id,
        name: (data.name as string) ?? "Boutique",
        slug: (data.slug as string) ?? "",
        photoUrl: (data.photoUrl as string) ?? "",
      } satisfies ExhibitorSummary;
    })
  );
  return stores.filter((s): s is ExhibitorSummary => s !== null);
}

export interface ExhibitorEventBadge {
  eventId: string;
  name: string;
  slug: string;
}

/**
 * Événements publiés où la boutique `storeId` est exposant confirmé (place payée).
 * Lecture serveur (Admin SDK) pour le badge "Exposant au marché X" sur la
 * boutique publique — les registrations ne sont pas lisibles côté public.
 */
export async function getExhibitorEvents(storeId: string): Promise<ExhibitorEventBadge[]> {
  const regSnap = await adminDb
    .collection("eventRegistrations")
    .where("storeId", "==", storeId)
    .where("status", "==", "paid")
    .get();

  const eventIds = [...new Set(regSnap.docs.map((d) => d.data().eventId as string))];
  const events = await Promise.all(
    eventIds.map(async (id) => {
      const m = await adminDb.collection("events").doc(id).get();
      if (!m.exists) return null;
      const data = m.data()!;
      if (data.status !== "published") return null;
      return {
        eventId: id,
        name: (data.name as string) ?? "Marché",
        slug: (data.slug as string) ?? "",
      } satisfies ExhibitorEventBadge;
    })
  );
  return events.filter((m): m is ExhibitorEventBadge => m !== null);
}

const STRIPE_MIN_AMOUNT = 50; // ~0,50 — charge minimale Stripe (unités mineures)

// Détermine le montant (centimes) d'une place selon la tarification de l'événement.
function resolveRegistrationAmount(
  pricing: Record<string, unknown>,
  categoryName?: string
): number {
  const type = pricing.type as string;
  const fixed = typeof pricing.fixedPrice === "number" ? pricing.fixedPrice : 0;
  const categories = (pricing.categories ?? []) as { name: string; price: number }[];

  if (type === "fixed") return fixed;
  if (type === "variable") {
    const cat = categories.find((c) => c.name === categoryName);
    if (!cat) throw new HttpError(400, "Catégorie de stand invalide");
    return cat.price;
  }
  // both : catégorie si fournie, sinon tarif fixe
  if (categoryName) {
    const cat = categories.find((c) => c.name === categoryName);
    if (!cat) throw new HttpError(400, "Catégorie de stand invalide");
    return cat.price;
  }
  return fixed;
}

// Statuts considérés comme une inscription active (anti-doublon).
const ACTIVE_STATUSES = ["pending", "approved", "payment_pending", "paid"];

/**
 * Crée une demande d'inscription `pending` pour l'artisan `uid` à l'événement `eventId`.
 * Vérifie : événement publié + inscriptions ouvertes, boutique de l'artisan existante,
 * pas de demande active en double. Renvoie aussi les infos pour notifier.
 */
export async function createRegistrationDoc(
  uid: string,
  eventId: string,
  body: { categoryName?: string; note?: string }
) {
  const [eventSnap, storeSnap, userSnap] = await Promise.all([
    adminDb.collection("events").doc(eventId).get(),
    adminDb.collection("stores").doc(uid).get(),
    adminDb.collection("users").doc(uid).get(),
  ]);

  if (!eventSnap.exists) throw new HttpError(404, "Marché introuvable");
  const event = eventSnap.data()!;
  if (event.status !== "published") throw new HttpError(400, "Marché non disponible");
  if (event.registrationOpen === false) {
    throw new HttpError(400, "Les inscriptions sont fermées");
  }
  if (!storeSnap.exists) throw new HttpError(400, "Vous devez créer une boutique avant de vous inscrire");

  // Anti-doublon : une seule demande active par événement et par artisan.
  const existing = await adminDb
    .collection("eventRegistrations")
    .where("eventId", "==", eventId)
    .where("userId", "==", uid)
    .get();
  if (existing.docs.some((d) => ACTIVE_STATUSES.includes(d.data().status))) {
    throw new HttpError(400, "Vous avez déjà une demande en cours pour ce marché");
  }

  const amount = resolveRegistrationAmount(event.pricing ?? {}, body.categoryName);
  const ref = adminDb.collection("eventRegistrations").doc();
  const now = FieldValue.serverTimestamp();

  await ref.set({
    id: ref.id,
    eventId,
    eventName: event.name,
    eventSlug: event.slug,
    organizerId: event.organizerId,
    storeId: uid,
    storeName: (storeSnap.data()?.name as string) ?? "Exposant",
    userId: uid,
    ...(body.categoryName && { categoryName: body.categoryName }),
    amount,
    currency: event.currency ?? "eur",
    status: "pending",
    ...(body.note?.trim() && { note: body.note.trim() }),
    createdAt: now,
    updatedAt: now,
  });

  const store = storeSnap.data() ?? {};
  const user = userSnap.data() ?? {};
  return {
    id: ref.id,
    event,
    artisanName: (user.name ?? store.name ?? "Artisan") as string,
    artisanEmail: user.email as string | undefined,
    storeName: (store.name ?? "Boutique") as string,
  };
}

/**
 * Crée (ou relit) le PaymentIntent de la place sur le compte connecté de
 * l'organisateur (direct charge + application_fee). L'artisan doit être le
 * propriétaire de la demande, à l'état payment_pending.
 */
export async function createRegistrationPaymentIntent(
  uid: string,
  eventId: string,
  registrationId: string
): Promise<{ clientSecret: string; connectedAccountId: string }> {
  const regRef = adminDb.collection("eventRegistrations").doc(registrationId);
  const regSnap = await regRef.get();
  if (!regSnap.exists) throw new HttpError(404, "Demande introuvable");
  const reg = regSnap.data()!;

  if (reg.eventId !== eventId) throw new HttpError(400, "Demande hors marché");
  if (reg.userId !== uid) throw new HttpError(403, "Accès refusé");
  if (reg.status !== "payment_pending") {
    throw new HttpError(400, "Cette demande n'est pas en attente de paiement");
  }

  const eventSnap = await adminDb.collection("events").doc(eventId).get();
  const event = eventSnap.data() ?? {};
  const destination = event.stripeAccountId as string | undefined;
  if (!destination || event.stripeChargesEnabled !== true) {
    throw new HttpError(400, "L'organisateur n'accepte pas encore les paiements");
  }

  const amount = reg.amount as number;
  const currency = (reg.currency as string) ?? event.currency ?? "eur";
  if (amount < STRIPE_MIN_AMOUNT) {
    throw new HttpError(400, "Montant de la place trop faible pour un paiement");
  }

  const feeCents = registrationFeeAmount(amount);
  const applicationFee = fromMinorUnits(feeCents, currency);
  const netAmount = fromMinorUnits(amount - feeCents, currency);

  // Direct charge sur le compte de l'organisateur, comme pour les commandes.
  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency,
      application_fee_amount: feeCents,
      description: `${event.name} — ${reg.storeName ?? "Exposant"}`,
      metadata: {
        type: "event_registration",
        registrationId,
        eventId,
        organizerId: String(event.organizerId ?? ""),
        exhibitorName: String(reg.storeName ?? "Exposant"),
      },
    },
    { idempotencyKey: `reg_${registrationId}`, stripeAccount: destination }
  );

  await regRef.update({
    stripePaymentIntentId: intent.id,
    applicationFee,
    netAmount,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { clientSecret: intent.client_secret!, connectedAccountId: destination };
}
