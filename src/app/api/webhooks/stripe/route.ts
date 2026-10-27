import type Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { promoDocId } from "@/lib/checkout-server";
import { fromMinorUnits } from "@/lib/countries";
import { formatCurrency } from "@/lib/utils";
import {
  sendOrderConfirmation,
  sendNewOrderAlert,
  sendRegistrationPaid,
  sendRegistrationPaymentReceived,
  sendBookingConfirmed,
  sendBookingFullRefunded,
} from "@/lib/emails/send";
import type { EmailStore } from "@/lib/emails/templates";

// firebase-admin nécessite le runtime Node (pas Edge). Jamais mis en cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Frais Stripe réel + net exact reversé au vendeur, lus depuis la
 * balance_transaction de la charge (sur le compte connecté en direct charge).
 * En capture `automatic_async`, la balance_transaction n'est pas toujours
 * attachée au moment du `payment_intent.succeeded` → on réessaie brièvement.
 * Retourne null si toujours indisponible (l'estimation reste alors en base).
 */
async function captureExactFees(
  chargeId: string,
  stripeAccount: string
): Promise<{ stripeFee: number; netAmount: number } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const charge = await stripe.charges.retrieve(
      chargeId,
      { expand: ["balance_transaction"] },
      { stripeAccount }
    );
    const bt = charge.balance_transaction;
    if (bt && typeof bt !== "string") {
      const stripeFeeCents = bt.fee_details
        .filter((d) => d.type === "stripe_fee")
        .reduce((sum, d) => sum + d.amount, 0);
      return {
        stripeFee: fromMinorUnits(stripeFeeCents, bt.currency),
        netAmount: fromMinorUnits(bt.net, bt.currency),
      };
    }
    if (attempt < 2) await sleep(1500);
  }
  return null;
}

/**
 * Paiement d'une inscription confirmé (metadata.type === "event_registration").
 * Flip la demande en `paid` de façon idempotente (garde notifiedAt) puis notifie
 * artisan + organisateur. Réutilise captureExactFees comme pour les commandes.
 */
async function handleEventRegistrationPaid(
  pi: Stripe.PaymentIntent,
  account: string | undefined
): Promise<void> {
  const registrationId = pi.metadata?.registrationId;
  if (!registrationId) return;

  const regRef = adminDb.collection("eventRegistrations").doc(registrationId);

  // Frais Stripe réels + net exact (best-effort).
  let exactFees: { stripeFee: number; netAmount: number } | null = null;
  try {
    const chargeId =
      typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
    if (chargeId && account) {
      exactFees = await captureExactFees(chargeId, account);
    }
  } catch (err) {
    console.error("[webhook] frais stand indisponibles", registrationId, err);
  }

  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(regRef);
    if (!snap.exists) return null;
    const data = snap.data()!;
    const firstTime = !data.notifiedAt;
    tx.set(
      regRef,
      {
        status: "paid",
        paidAt: data.paidAt ?? new Date().toISOString(),
        ...(firstTime && { notifiedAt: new Date().toISOString() }),
        ...(exactFees && exactFees),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { data, firstTime };
  });

  if (!result?.firstTime) return;

  // Notifications best-effort hors transaction.
  try {
    const reg = result.data;
    const [eventSnap, artisanSnap, storeSnap] = await Promise.all([
      adminDb.collection("events").doc(reg.eventId as string).get(),
      adminDb.collection("users").doc(reg.userId as string).get(),
      adminDb.collection("stores").doc(reg.storeId as string).get(),
    ]);
    const eventDoc = eventSnap.data() ?? {};
    const artisan = artisanSnap.data() ?? {};
    const store = storeSnap.data() ?? {};
    const eventName = (eventDoc.name as string) ?? "Marché";
    const artisanName = (artisan.name ?? store.name ?? "Artisan") as string;
    const storeName = (store.name ?? "Boutique") as string;
    const currency = (reg.currency as string) ?? "eur";
    const amountLabel = formatCurrency(fromMinorUnits(reg.amount as number, currency), currency);

    const artisanEmail = artisan.email as string | undefined;
    if (artisanEmail) {
      await sendRegistrationPaid(
        artisanEmail,
        artisanName,
        eventName,
        (eventDoc.schedule?.description as string) ?? "",
        `${APP_URL}/fr/dashboard/settings`
      );
    }

    const organizerSnap = await adminDb.collection("users").doc(eventDoc.organizerId as string).get();
    const organizerEmail = organizerSnap.data()?.email as string | undefined;
    if (organizerEmail) {
      await sendRegistrationPaymentReceived(
        organizerEmail,
        eventName,
        artisanName,
        storeName,
        amountLabel
      );
    }
  } catch (err) {
    console.error("[webhook] envoi emails inscription échoué", registrationId, err);
  }
}

// Libellé de créneau pour l'email de confirmation ("Nom — jour date heure").
function bookingLabel(prestNom: string, dateHeure: unknown): string {
  const d =
    dateHeure && typeof (dateHeure as { toDate?: () => Date }).toDate === "function"
      ? (dateHeure as { toDate: () => Date }).toDate()
      : null;
  if (!d) return prestNom;
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
 * Paiement d'une réservation d'atelier confirmé (metadata.type === "booking").
 * Flip la réservation en `confirmee` de façon idempotente (garde notifiedAt) puis
 * notifie le client. Réutilise captureExactFees comme pour les commandes.
 */
async function handleBookingPaid(
  pi: Stripe.PaymentIntent,
  account: string | undefined
): Promise<void> {
  const reservationId = pi.metadata?.reservationId;
  if (!reservationId) return;

  const resaRef = adminDb.collection("reservations").doc(reservationId);

  let exactFees: { stripeFee: number; netAmount: number } | null = null;
  try {
    const chargeId =
      typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
    if (chargeId && account) {
      exactFees = await captureExactFees(chargeId, account);
    }
  } catch (err) {
    console.error("[webhook] frais réservation indisponibles", reservationId, err);
  }

  // La place n'étant pas tenue pendant le paiement (payment_pending), on la
  // décompte ICI, à la confirmation, en revérifiant la capacité. Si plus de place
  // (course à la dernière place), on rembourse et on remet le client en liste
  // d'attente — zéro survente.
  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(resaRef);
    if (!snap.exists) return null;
    const data = snap.data()!;

    // Rejeu Stripe : déjà confirmée → ne rien refaire (pas de double décrément).
    if (data.statut === "confirmee") return { outcome: "replay" as const };

    const creneauRef = adminDb.collection("creneaux").doc(data.creneauId as string);
    const creneauSnap = await tx.get(creneauRef);
    const capaciteRestante = creneauSnap.exists
      ? (creneauSnap.data()!.capaciteRestante as number)
      : 0;

    if (capaciteRestante > 0) {
      // Place disponible → confirme + décompte.
      tx.set(
        resaRef,
        {
          statut: "confirmee",
          paidAt: data.paidAt ?? new Date().toISOString(),
          notifiedAt: new Date().toISOString(),
          ...(exactFees && exactFees),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      if (creneauSnap.exists) {
        tx.update(creneauRef, {
          capaciteRestante: FieldValue.increment(-1),
          updatedAt: new Date().toISOString(),
        });
      }
      return { outcome: "confirmed" as const, data };
    }

    // Complet entre-temps → remboursement + retour en liste d'attente.
    tx.set(
      resaRef,
      { statut: "en_attente", updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return { outcome: "refund" as const, data };
  });

  if (!result || result.outcome === "replay") return;

  const resa = result.data;
  const prestSnap = await adminDb
    .collection("prestations")
    .doc(resa.prestationId as string)
    .get();
  const prestNom = (prestSnap.data()?.nom as string) ?? "Atelier";
  const label = bookingLabel(prestNom, resa.dateHeure);

  if (result.outcome === "refund") {
    // Rembourse le paiement (direct charge → header compte connecté).
    try {
      await stripe.refunds.create(
        { payment_intent: pi.id, refund_application_fee: true },
        account ? { stripeAccount: account } : undefined
      );
    } catch (err) {
      console.error("[webhook] remboursement course-place échoué", reservationId, err);
    }
    try {
      await sendBookingFullRefunded(resa.clientEmail as string, resa.clientNom as string, label);
    } catch (err) {
      console.error("[webhook] email complet-remboursé échoué", reservationId, err);
    }
    return;
  }

  // outcome === "confirmed"
  try {
    await sendBookingConfirmed(resa.clientEmail as string, resa.clientNom as string, label);
  } catch (err) {
    console.error("[webhook] envoi email réservation échoué", reservationId, err);
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !WEBHOOK_SECRET) {
    return Response.json({ error: "Signature manquante" }, { status: 400 });
  }

  // Corps brut requis pour vérifier la signature — ne pas parser en JSON avant.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[webhook] signature invalide", err);
    return Response.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;

        // Paiement d'inscription à un événement — flux distinct des commandes.
        if (pi.metadata?.type === "event_registration") {
          await handleEventRegistrationPaid(pi, event.account);
          break;
        }

        // Paiement d'une réservation d'atelier — flux distinct des commandes.
        if (pi.metadata?.type === "booking") {
          await handleBookingPaid(pi, event.account);
          break;
        }

        const orderId = pi.metadata?.orderId;
        if (!orderId) break;

        const orderRef = adminDb.collection("orders").doc(orderId);

        // Frais Stripe réels + net exact (voir captureExactFees). Best-effort : un
        // échec/indisponibilité ne casse pas le webhook (l'estimation reste).
        let exactFees: { stripeFee: number; netAmount: number } | null = null;
        try {
          const chargeId =
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge?.id;
          if (chargeId && event.account) {
            exactFees = await captureExactFees(chargeId, event.account);
            if (!exactFees) {
              console.warn(
                "[webhook] frais Stripe indisponibles (balance_transaction pas prête)",
                orderId
              );
            }
          }
        } catch (err) {
          console.error("[webhook] lecture frais Stripe échouée", orderId, err);
        }

        // Transaction idempotente : flip paid + pose notifiedAt une seule fois.
        // firstTime=false si Stripe rejoue l'event (notifiedAt déjà présent) → pas de doublon d'email.
        const result = await adminDb.runTransaction(async (tx) => {
          const snap = await tx.get(orderRef);
          if (!snap.exists) return null;
          const data = snap.data()!;
          const firstTime = !data.notifiedAt;
          tx.set(
            orderRef,
            {
              paid: true,
              paidAt: data.paidAt ?? new Date().toISOString(),
              ...(firstTime && { notifiedAt: new Date().toISOString() }),
              // Net + frais Stripe exacts (réajuste l'estimation de la création).
              ...(exactFees && exactFees),
            },
            { merge: true }
          );
          // Incrémente le compteur d'usage du code promo (commandes payées
          // uniquement, une seule fois grâce à la garde firstTime).
          if (firstTime && data.promoCode && data.storeId) {
            const promoRef = adminDb
              .collection("promoCodes")
              .doc(promoDocId(data.storeId as string, data.promoCode as string));
            tx.set(promoRef, { usedCount: FieldValue.increment(1) }, { merge: true });
          }
          return { data, firstTime };
        });

        // Envoi hors transaction, best-effort. Une erreur ici ne doit pas faire
        // échouer le webhook (notifiedAt est déjà posé → pas de re-tentative utile).
        if (result?.firstTime) {
          try {
            const data = result.data;
            const storeId = data.storeId as string | undefined;
            let store: EmailStore = {};
            let sellerEmail: string | undefined;
            if (storeId) {
              const [storeSnap, userSnap] = await Promise.all([
                adminDb.collection("stores").doc(storeId).get(),
                adminDb.collection("users").doc(storeId).get(),
              ]);
              const s = storeSnap.data() ?? {};
              store = { name: s.name, phone: s.phone, email: s.email, address: s.address };
              sellerEmail = userSnap.data()?.email as string | undefined;
            }
            await sendOrderConfirmation(orderId, data, store);
            // Pas d'alerte vendeur pour les commandes qu'il crée lui-même (manuelles).
            if (data.manual !== true) {
              await sendNewOrderAlert(orderId, data, store, sellerEmail);
            }
          } catch (err) {
            console.error("[webhook] envoi emails échoué", orderId, err);
          }
        }
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object;

        // Réservation d'atelier abandonnée : `payment_pending` ne tient AUCUNE
        // place (décomptée seulement au paiement) → on supprime simplement la
        // réservation non payée. Rien à libérer, pas de promotion.
        if (pi.metadata?.type === "booking") {
          const reservationId = pi.metadata?.reservationId;
          if (reservationId) {
            const ref = adminDb.collection("reservations").doc(reservationId);
            const snap = await ref.get();
            if (snap.exists && snap.data()?.statut === "payment_pending") {
              await ref.delete();
            }
          }
          break;
        }

        const orderId = pi.metadata?.orderId;
        // Nettoie la commande pending uniquement si le PaymentIntent est annulé.
        // NB : on ne supprime PAS sur payment_failed — le client peut réessayer
        // sa carte sur le même PaymentIntent, la commande doit survivre.
        if (orderId) {
          const ref = adminDb.collection("orders").doc(orderId);
          const snap = await ref.get();
          if (snap.exists && snap.data()?.paid === false) await ref.delete();
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // 500 → Stripe rejouera l'événement.
    console.error("[webhook] traitement échoué", event.type, err);
    return Response.json({ error: "Traitement échoué" }, { status: 500 });
  }

  return Response.json({ received: true });
}
