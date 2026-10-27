import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Query } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { HttpError } from "@/lib/server-auth";
import { stripe, bookingFeeAmount } from "@/lib/stripe";
import { generateSlug } from "@/lib/utils";
import { currencyForCountry, fromMinorUnits } from "@/lib/countries";
import { computeOccurrences, dateFromSlotKey } from "@/lib/occurrences";
import {
  sendBookingCancelled,
  sendWaitlistPromoted,
  sendWaitlistPayToConfirm,
} from "@/lib/emails/send";
import type { PrestationInput } from "@/lib/validations/booking";
import type { Prestation, Creneau, Reservation, Store } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const STRIPE_MIN_AMOUNT = 50; // ~0,50 — charge minimale Stripe (unités mineures)

// Statuts d'une réservation qui « occupe » une entrée active (anti-doublon).
const ACTIVE_STATUSES = ["confirmee", "en_attente", "payment_pending"];
// Statut qui tient une place (décrémente la capacité). Seule une réservation
// confirmée (payée ou sur place) occupe une place ; payment_pending ne tient rien.
const SEAT_STATUSES = ["confirmee"];

// ─── Lectures publiques côté serveur (Admin SDK, bypass règles) ─────
// Les pages publiques (atelier/[slug]) sont rendues côté serveur sans session
// Firebase → on lit via l'Admin SDK ; la visibilité (actif) est contrôlée ici.
export async function getPrestationBySlugServer(
  slug: string
): Promise<Prestation | null> {
  const snap = await adminDb
    .collection("prestations")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Prestation;
}

// Boutique propriétaire d'un atelier (par id de doc) — lecture publique serveur
// pour afficher le StoreHeader sur la page atelier. Sérialisable.
export async function getStoreByIdServer(id: string): Promise<Store | null> {
  const snap = await adminDb.collection("stores").doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Store;
}

export interface PrestationCard {
  id: string;
  slug: string;
  nom: string;
  photoUrl: string;
  prix: number;
  currency: string;
  modePaiement: "immediat" | "sur_place";
  dureeMinutes: number;
  nextDateMs: number | null; // prochaine occurrence (ms) ou null si aucune à venir
}

// Ateliers actifs d'une boutique, avec leur prochaine occurrence — pour la page
// boutique publique (SSR, Admin SDK). Sérialisable (pas de Timestamp).
// Miroir de getExhibitorEvents (event-server.ts).
export async function getActivePrestationsByBoutiqueServer(
  boutiqueId: string
): Promise<PrestationCard[]> {
  const snap = await adminDb
    .collection("prestations")
    .where("boutiqueId", "==", boutiqueId)
    .where("actif", "==", true)
    .get();

  return snap.docs
    .map((d) => {
      const p = { id: d.id, ...d.data() } as Prestation;
      const next = computeOccurrences(p)[0];
      return {
        id: p.id,
        slug: p.slug,
        nom: p.nom,
        photoUrl: p.photoUrl ?? "",
        prix: p.prix ?? 0,
        currency: p.currency ?? "eur",
        modePaiement: p.modePaiement,
        dureeMinutes: p.dureeMinutes ?? 0,
        nextDateMs: next ? next.dateHeureMs : null,
      } satisfies PrestationCard;
    })
    .sort((a, b) => (a.nextDateMs ?? Infinity) - (b.nextDateMs ?? Infinity));
}

// Créneaux matérialisés d'une prestation (docs `creneaux` existants), indexés par
// slotKey. Seuls les créneaux ayant eu ≥1 réservation ou annulés existent.
async function getMaterializedSlots(
  prestationId: string
): Promise<Map<string, Creneau>> {
  const snap = await adminDb
    .collection("creneaux")
    .where("prestationId", "==", prestationId)
    .get();
  const map = new Map<string, Creneau>();
  snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Creneau));
  return map;
}

export interface UpcomingSlot {
  slotKey: string;
  dateHeureMs: number;
  capaciteRestante: number;
  capaciteMax: number;
}

// Créneaux réservables à venir — occurrences calculées à la volée (règle de la
// prestation) fusionnées avec les créneaux matérialisés pour la capacité réelle.
// Une occurrence non matérialisée = pleine capacité. Les créneaux annulés/terminés
// sont exclus. Pour la page publique (SSR) et réutilisable ailleurs.
export async function getUpcomingSlotsServer(
  prestation: Prestation
): Promise<UpcomingSlot[]> {
  const occ = computeOccurrences(prestation);
  const mat = await getMaterializedSlots(prestation.id);
  const out: UpcomingSlot[] = [];
  for (const o of occ) {
    const c = mat.get(o.slotKey);
    if (c && c.statut !== "ouvert") continue; // annulé / terminé → non réservable
    out.push({
      slotKey: o.slotKey,
      dateHeureMs: o.dateHeureMs,
      capaciteRestante: c ? c.capaciteRestante : prestation.capaciteMax,
      capaciteMax: prestation.capaciteMax,
    });
  }
  return out;
}

// Slug unique : base = slug du nom, suffixe -2, -3… en cas de collision.
async function uniqueSlug(name: string): Promise<string> {
  const base = generateSlug(name) || "atelier";
  let slug = base;
  let n = 1;
  while (n < 50) {
    const snap = await adminDb
      .collection("prestations")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
  throw new HttpError(500, "Impossible de générer un slug");
}

/**
 * Crée une prestation pour la boutique de `uid`. Génère un slug unique, fige la
 * devise depuis le pays de la boutique et recopie le statut Connect (miroir).
 * Aucune génération de créneaux : les occurrences sont calculées à la volée et
 * matérialisées à la réservation.
 */
export async function createPrestationDoc(uid: string, input: PrestationInput) {
  const storeSnap = await adminDb.collection("stores").doc(uid).get();
  if (!storeSnap.exists) {
    throw new HttpError(400, "Vous devez créer une boutique avant un atelier");
  }
  const store = storeSnap.data()!;
  const slug = await uniqueSlug(input.nom);
  const currency = currencyForCountry(store.country as string | undefined);
  const ref = adminDb.collection("prestations").doc();

  const data = {
    id: ref.id,
    slug,
    boutiqueId: uid,
    nom: input.nom,
    description: input.description ?? "",
    photoUrl: input.photoUrl ?? "",
    dureeMinutes: input.dureeMinutes,
    capaciteMax: input.capaciteMax,
    prix: input.prix,
    currency,
    modePaiement: input.modePaiement,
    modeRecurrence: input.modeRecurrence,
    ...(input.modeRecurrence === "recurrent"
      ? { horairesRecurrence: input.horairesRecurrence }
      : { datesPonctuelles: input.datesPonctuelles }),
    actif: input.actif ?? true,
    // Miroir Connect de la boutique (compte unifié).
    ...(typeof store.stripeAccountId === "string" && {
      stripeAccountId: store.stripeAccountId,
    }),
    stripeChargesEnabled: store.stripeChargesEnabled === true,
    stripePayoutsEnabled: store.stripePayoutsEnabled === true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(data);
  return { id: ref.id, slug };
}

/**
 * Met à jour une prestation (propriétaire uniquement). Le formulaire renvoie un
 * payload complet (union discriminée) → on réécrit les champs de récurrence selon
 * le mode et on purge ceux de l'autre mode (FieldValue.delete). Les occurrences
 * étant calculées à la volée, changer la règle change immédiatement les créneaux
 * proposés ; les créneaux déjà matérialisés (réservés/annulés) restent intacts.
 */
export async function updatePrestationDoc(
  uid: string,
  prestationId: string,
  input: PrestationInput
) {
  const ref = adminDb.collection("prestations").doc(prestationId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Atelier introuvable");
  if (snap.data()?.boutiqueId !== uid) throw new HttpError(403, "Accès refusé");

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    nom: input.nom,
    description: input.description ?? "",
    ...(input.photoUrl !== undefined && { photoUrl: input.photoUrl }),
    dureeMinutes: input.dureeMinutes,
    capaciteMax: input.capaciteMax,
    prix: input.prix,
    modePaiement: input.modePaiement,
    modeRecurrence: input.modeRecurrence,
    actif: input.actif ?? true,
    // Champs de récurrence : on renseigne le mode courant, on purge l'autre + le
    // legacy (joursRecurrence/heureRecurrence, docs v2).
    ...(input.modeRecurrence === "recurrent"
      ? {
          horairesRecurrence: input.horairesRecurrence,
          datesPonctuelles: FieldValue.delete(),
          joursRecurrence: FieldValue.delete(),
          heureRecurrence: FieldValue.delete(),
        }
      : {
          datesPonctuelles: input.datesPonctuelles,
          horairesRecurrence: FieldValue.delete(),
          joursRecurrence: FieldValue.delete(),
          heureRecurrence: FieldValue.delete(),
        }),
  };

  await ref.update(update);
  return { ok: true };
}

/**
 * Crée une réservation pour le client `uid` sur un créneau. Transaction atomique
 * sur la capacité :
 *  • capacité > 0 + sur_place → `confirmee` (décrémente)
 *  • capacité > 0 + immediat  → `payment_pending` (tient la place, décrémente)
 *  • capacité == 0            → `en_attente` (pas de décrément, liste d'attente)
 * Anti-doublon : une seule réservation active par créneau et par client.
 */
export async function createReservationDoc(
  uid: string,
  prestationId: string,
  slotKey: string,
  client: { email: string; nom: string }
): Promise<{ id: string; statut: string; needsPayment: boolean }> {
  const prestSnap = await adminDb.collection("prestations").doc(prestationId).get();
  if (!prestSnap.exists) throw new HttpError(404, "Atelier introuvable");
  const prest = { id: prestSnap.id, ...prestSnap.data() } as Prestation;
  if (prest.actif !== true) throw new HttpError(400, "Atelier indisponible");

  // Sécurité : le slotKey doit correspondre à une occurrence future réelle de la
  // règle (on ne fait pas confiance au client). Fournit aussi la date du créneau.
  const occ = computeOccurrences(prest).find((o) => o.slotKey === slotKey);
  if (!occ) throw new HttpError(400, "Créneau invalide ou expiré");
  const dateHeure = Timestamp.fromDate(new Date(occ.dateHeureMs));

  const creneauRef = adminDb.collection("creneaux").doc(slotKey);
  const resaRef = adminDb.collection("reservations").doc();

  const result = await adminDb.runTransaction(async (tx) => {
    // Get-or-create : le créneau n'est matérialisé qu'à la 1re réservation.
    const creneauSnap = await tx.get(creneauRef);
    const exists = creneauSnap.exists;
    const creneau = creneauSnap.data();
    if (exists && creneau!.statut !== "ouvert") {
      throw new HttpError(400, "Ce créneau n'est plus disponible");
    }

    // Anti-doublon : réservation active existante de ce client sur ce créneau.
    const dupSnap = await tx.get(
      adminDb
        .collection("reservations")
        .where("creneauId", "==", slotKey)
        .where("clientId", "==", uid) as Query
    );
    if (dupSnap.docs.some((d) => ACTIVE_STATUSES.includes(d.data().statut))) {
      throw new HttpError(400, "Vous avez déjà une réservation sur ce créneau");
    }

    const capaciteRestante = exists
      ? (creneau!.capaciteRestante as number)
      : prest.capaciteMax;
    const hasSeat = capaciteRestante > 0;
    const immediat = prest.modePaiement === "immediat";
    const statut = !hasSeat
      ? "en_attente"
      : immediat
        ? "payment_pending"
        : "confirmee";

    // La place n'est décomptée QUE lorsqu'elle est confirmée (payée ou sur place).
    // `payment_pending` (paiement en ligne en cours) et `en_attente` ne tiennent
    // pas de place → le décrément a lieu ici pour sur_place, sinon au webhook.
    const holdsSeat = statut === "confirmee";
    if (!exists) {
      // Matérialise le créneau avec la capacité par défaut de la prestation.
      tx.set(creneauRef, {
        id: slotKey,
        prestationId,
        boutiqueId: prest.boutiqueId,
        dateHeure,
        capaciteMax: prest.capaciteMax,
        capaciteRestante: prest.capaciteMax - (holdsSeat ? 1 : 0),
        statut: "ouvert" as const,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (holdsSeat) {
      tx.update(creneauRef, {
        capaciteRestante: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const now = FieldValue.serverTimestamp();
    tx.set(resaRef, {
      id: resaRef.id,
      creneauId: slotKey,
      prestationId,
      boutiqueId: prest.boutiqueId,
      clientId: uid,
      clientEmail: client.email,
      clientNom: client.nom,
      prestationNom: prest.nom,
      prestationSlug: prest.slug,
      dateHeure,
      statut,
      amount: prest.prix ?? 0,
      currency: prest.currency ?? "eur",
      createdAt: now,
      updatedAt: now,
    });

    return { statut, needsPayment: statut === "payment_pending" };
  });

  return { id: resaRef.id, ...result };
}

/**
 * Crée (ou relit) le PaymentIntent d'une réservation sur le compte connecté de la
 * boutique (direct charge + application_fee). Réservation en `payment_pending`,
 * propriété du client `uid`.
 */
export async function createReservationPaymentIntent(
  uid: string,
  prestationId: string,
  reservationId: string
): Promise<{ clientSecret: string; connectedAccountId: string }> {
  const resaRef = adminDb.collection("reservations").doc(reservationId);
  const resaSnap = await resaRef.get();
  if (!resaSnap.exists) throw new HttpError(404, "Réservation introuvable");
  const resa = resaSnap.data()!;

  if (resa.prestationId !== prestationId) throw new HttpError(400, "Réservation hors atelier");
  if (resa.clientId !== uid) throw new HttpError(403, "Accès refusé");
  if (resa.statut !== "payment_pending") {
    throw new HttpError(400, "Cette réservation n'est pas en attente de paiement");
  }

  const prestSnap = await adminDb.collection("prestations").doc(prestationId).get();
  const prest = prestSnap.data() ?? {};
  const destination = prest.stripeAccountId as string | undefined;
  if (!destination || prest.stripeChargesEnabled !== true) {
    throw new HttpError(400, "La boutique n'accepte pas encore les paiements");
  }

  const amount = resa.amount as number;
  const currency = (resa.currency as string) ?? prest.currency ?? "eur";
  if (amount < STRIPE_MIN_AMOUNT) {
    throw new HttpError(400, "Montant trop faible pour un paiement");
  }

  const feeCents = bookingFeeAmount(amount);
  const applicationFee = fromMinorUnits(feeCents, currency);
  const netAmount = fromMinorUnits(amount - feeCents, currency);

  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency,
      application_fee_amount: feeCents,
      ...(resa.clientEmail && { receipt_email: String(resa.clientEmail) }),
      description: `${prest.nom} — ${resa.clientNom}`,
      metadata: {
        type: "booking",
        reservationId,
        prestationId,
        boutiqueId: String(prest.boutiqueId ?? ""),
        customerName: String(resa.clientNom ?? ""),
        customerEmail: String(resa.clientEmail ?? ""),
      },
    },
    { idempotencyKey: `resa_${reservationId}`, stripeAccount: destination }
  );

  await resaRef.update({
    paiementStripeId: intent.id,
    applicationFee,
    netAmount,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { clientSecret: intent.client_secret!, connectedAccountId: destination };
}

// Rembourse une réservation payée (direct charge → header compte connecté +
// remboursement de l'application_fee). Best-effort : log sans throw.
async function refundReservation(
  paiementStripeId: string | undefined,
  destination: string | undefined
): Promise<void> {
  if (!paiementStripeId || !destination) return;
  try {
    await stripe.refunds.create(
      { payment_intent: paiementStripeId, refund_application_fee: true },
      { stripeAccount: destination }
    );
  } catch (err) {
    console.error("[booking] remboursement échoué", paiementStripeId, err);
  }
}

// Libellé de la prestation pour les emails (nom + date du créneau).
function slotLabel(prestNom: string, dateHeure?: Timestamp): string {
  if (!dateHeure) return prestNom;
  const d = dateHeure.toDate();
  const when = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
  return `${prestNom} — ${when}`;
}

/**
 * Promeut la plus ancienne réservation `en_attente` d'un créneau quand une place
 * se libère.
 * - sur_place → `confirmee` : consomme la place libérée (décrément).
 * - immediat  → `payment_pending` + email « payez pour confirmer ». La place
 *   n'est PAS tenue (décomptée seulement au paiement, cf. webhook) : elle reste
 *   disponible jusqu'au règlement.
 */
export async function promoteWaitlist(creneauId: string): Promise<void> {
  const creneauRef = adminDb.collection("creneaux").doc(creneauId);

  const promoted = await adminDb.runTransaction(async (tx) => {
    const creneauSnap = await tx.get(creneauRef);
    if (!creneauSnap.exists) return null;
    const creneau = creneauSnap.data()!;
    if (creneau.statut !== "ouvert" || (creneau.capaciteRestante as number) <= 0) {
      return null;
    }

    const waitSnap = await tx.get(
      adminDb
        .collection("reservations")
        .where("creneauId", "==", creneauId)
        .where("statut", "==", "en_attente")
        .orderBy("createdAt", "asc")
        .limit(1) as Query
    );
    if (waitSnap.empty) return null;

    const resaDoc = waitSnap.docs[0];
    const prestId = resaDoc.data().prestationId as string;
    const prestSnap = await tx.get(adminDb.collection("prestations").doc(prestId));
    const immediat = prestSnap.data()?.modePaiement === "immediat";
    const statut = immediat ? "payment_pending" : "confirmee";

    // sur_place : la promotion confirme → consomme la place. immediat : pas de
    // décrément (place tenue seulement au paiement).
    if (!immediat) {
      tx.update(creneauRef, {
        capaciteRestante: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(resaDoc.ref, {
      statut,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      resa: { id: resaDoc.id, ...resaDoc.data() } as Reservation,
      prest: prestSnap.data() ?? {},
      immediat,
    };
  });

  if (!promoted) return;

  // Notifications best-effort hors transaction.
  const { resa, prest, immediat } = promoted;
  const label = slotLabel((prest.nom as string) ?? "Atelier", resa.dateHeure);
  try {
    if (immediat) {
      const payUrl = `${APP_URL}/fr/atelier/${prest.slug}?resa=${resa.id}`;
      await sendWaitlistPayToConfirm(resa.clientEmail, resa.clientNom, label, payUrl);
    } else {
      await sendWaitlistPromoted(resa.clientEmail, resa.clientNom, label);
    }
  } catch (err) {
    console.error("[booking] email promotion échoué", resa.id, err);
  }
}

// Charge une prestation en vérifiant la propriété (créateur == uid).
async function loadOwnedPrestation(uid: string, prestationId: string) {
  const snap = await adminDb.collection("prestations").doc(prestationId).get();
  if (!snap.exists) throw new HttpError(404, "Atelier introuvable");
  const prest = snap.data()!;
  if (prest.boutiqueId !== uid) throw new HttpError(403, "Accès refusé");
  return prest;
}

/**
 * Annulation d'une réservation par le créateur. Rembourse si payée, libère la
 * place, notifie le client, puis promeut la liste d'attente.
 */
export async function cancelReservationDoc(
  uid: string,
  prestationId: string,
  reservationId: string
): Promise<{ ok: boolean }> {
  const prest = await loadOwnedPrestation(uid, prestationId);
  const resaRef = adminDb.collection("reservations").doc(reservationId);
  const resaSnap = await resaRef.get();
  if (!resaSnap.exists) throw new HttpError(404, "Réservation introuvable");
  const resa = resaSnap.data()!;
  if (resa.prestationId !== prestationId) throw new HttpError(400, "Réservation hors atelier");
  if (resa.statut === "annulee_createur") return { ok: true };

  const releasedSeat = SEAT_STATUSES.includes(resa.statut);

  await refundReservation(resa.paiementStripeId as string | undefined, prest.stripeAccountId as string | undefined);

  await resaRef.update({
    statut: "annulee_createur",
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Libère la place uniquement si le créneau est encore ouvert.
  if (releasedSeat) {
    const creneauRef = adminDb.collection("creneaux").doc(resa.creneauId as string);
    const creneauSnap = await creneauRef.get();
    if (creneauSnap.exists && creneauSnap.data()?.statut === "ouvert") {
      await creneauRef.update({
        capaciteRestante: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // Notifie le client (best-effort).
  const label = slotLabel((prest.nom as string) ?? "Atelier", resa.dateHeure);
  try {
    await sendBookingCancelled(resa.clientEmail as string, resa.clientNom as string, label);
  } catch (err) {
    console.error("[booking] email annulation échoué", reservationId, err);
  }

  // Promotion de la liste d'attente après libération de la place.
  if (releasedSeat) await promoteWaitlist(resa.creneauId as string);

  return { ok: true };
}

/**
 * Annulation d'un créneau entier par le créateur. Passe le créneau en
 * `annule_createur`, annule toutes les réservations liées (confirmée / en attente
 * / payment_pending), rembourse celles payées et notifie chaque client. Pas de
 * promotion (le créneau est fermé).
 */
export async function cancelSlotDoc(
  uid: string,
  prestationId: string,
  slotKey: string
): Promise<{ ok: boolean; cancelled: number }> {
  const prest = await loadOwnedPrestation(uid, prestationId);
  // Le slotKey doit appartenir à cette prestation (préfixe id) — sécurité.
  if (!slotKey.startsWith(`${prestationId}_`)) {
    throw new HttpError(400, "Créneau hors atelier");
  }

  const creneauRef = adminDb.collection("creneaux").doc(slotKey);
  const creneauSnap = await creneauRef.get();

  if (creneauSnap.exists) {
    await creneauRef.update({
      statut: "annule_createur",
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Occurrence pas encore réservée → matérialise le créneau en annulé pour la
    // bloquer (elle disparaît des créneaux réservables calculés).
    const dt = dateFromSlotKey(slotKey);
    if (!dt) throw new HttpError(400, "Créneau invalide");
    await creneauRef.set({
      id: slotKey,
      prestationId,
      boutiqueId: prest.boutiqueId,
      dateHeure: Timestamp.fromDate(dt),
      capaciteMax: prest.capaciteMax,
      capaciteRestante: prest.capaciteMax,
      statut: "annule_createur" as const,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const resaSnap = await adminDb
    .collection("reservations")
    .where("creneauId", "==", slotKey)
    .get();

  const active = resaSnap.docs.filter((d) =>
    ACTIVE_STATUSES.includes(d.data().statut)
  );

  for (const doc of active) {
    const resa = doc.data();
    await refundReservation(
      resa.paiementStripeId as string | undefined,
      prest.stripeAccountId as string | undefined
    );
    await doc.ref.update({
      statut: "annulee_createur",
      updatedAt: FieldValue.serverTimestamp(),
    });
    const label = slotLabel((prest.nom as string) ?? "Atelier", resa.dateHeure);
    try {
      await sendBookingCancelled(
        resa.clientEmail as string,
        resa.clientNom as string,
        label
      );
    } catch (err) {
      console.error("[booking] email annulation créneau échoué", doc.id, err);
    }
  }

  return { ok: true, cancelled: active.length };
}
