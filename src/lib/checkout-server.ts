import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripe, platformFeeAmount } from "@/lib/stripe";
import { HttpError } from "@/lib/server-auth";
import { sendOrderConfirmation, sendNewOrderAlert } from "@/lib/emails/send";
import { distanceKm, geocodeAddress } from "@/lib/geo";
import { zoneForDestination, type ShippingZone } from "@/lib/regions";
import { currencyForCountry, toMinorUnits, fromMinorUnits } from "@/lib/countries";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_CANCELLATION_POLICY } from "@/lib/cancellation-policy";
import type { EmailStore } from "@/lib/emails/templates";
import type { FulfillmentMethod, PromoCode } from "@/types";

// Item tel qu'envoyé par le client — on ne fait JAMAIS confiance au prix client,
// seulement aux références (productId, options, quantité).
export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  selectedOptions?: Record<string, string>;
  variantId?: string;
  customFieldValue?: string;
}

export interface CheckoutCustomer {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: string;
  addressComplement?: string;
  zipCode?: string;
  city?: string;
  requestedDate?: string;
  requestedTime?: string;
  note?: string;
}

export interface CreateIntentInput {
  slug: string;
  items: CheckoutItemInput[];
  customer: CheckoutCustomer;
  customerId?: string;
  promoCode?: string;
}

const STRIPE_MIN_AMOUNT = 50; // ~0,50 — charge minimale Stripe (unités mineures)

type ShippingZonesConfig = Partial<
  Record<ShippingZone, { enabled: boolean; fee: number }>
>;

/**
 * Tarif d'expédition selon le palier de la destination, ou null si la boutique
 * n'expédie pas vers ce pays. Legacy (pas de shippingZones) → tarif plat partout.
 */
function shippingFeeFor(
  store: Record<string, unknown>,
  destCountry: string | null
): { zone: ShippingZone; fee: number } | null {
  const zone = zoneForDestination(store.country as string | undefined, destCountry);
  const zones = store.shippingZones as ShippingZonesConfig | undefined;
  if (!zones) {
    // Boutique legacy : ancien tarif plat, expédie partout (pas de régression).
    return { zone, fee: Number(store.shippingFee ?? 0) };
  }
  const z = zones[zone];
  if (!z || !z.enabled) return null;
  return { zone, fee: Number(z.fee ?? 0) };
}

/** id de doc déterministe : unique par boutique, get() direct sans index. */
export const promoDocId = (storeId: string, code: string) =>
  `${storeId}_${code.trim().toUpperCase()}`;

/** Montant € déduit du sous-total (jamais des frais), clampé au sous-total. */
function computeDiscount(promo: PromoCode, subtotal: number): number {
  const raw =
    promo.discountType === "percentage"
      ? subtotal * (promo.discountValue / 100)
      : promo.discountValue;
  return Math.min(Math.round(raw * 100) / 100, subtotal);
}

export interface AppliedPromo {
  code: string;
  discount: number;
}

/**
 * Valide un code promo pour une boutique et calcule la réduction.
 * Source unique réutilisée par l'aperçu (route promo) et le paiement.
 * Lève HttpError(400) avec un message clair si le code est invalide.
 */
export async function validateAndApplyPromo(
  storeId: string,
  rawCode: string,
  subtotal: number,
  currency = "eur"
): Promise<AppliedPromo> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new HttpError(400, "Code promo vide");

  const snap = await adminDb.collection("promoCodes").doc(promoDocId(storeId, code)).get();
  if (!snap.exists) throw new HttpError(400, "Code promo invalide");

  const promo = snap.data() as PromoCode;
  if (!promo.active) throw new HttpError(400, "Ce code promo n'est plus actif");

  if (promo.expiresAt) {
    const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    if (today > promo.expiresAt) throw new HttpError(400, "Ce code promo a expiré");
  }
  if (typeof promo.maxUses === "number" && (promo.usedCount ?? 0) >= promo.maxUses) {
    throw new HttpError(400, "Ce code promo n'est plus disponible");
  }
  if (typeof promo.minOrderAmount === "number" && subtotal < promo.minOrderAmount) {
    throw new HttpError(
      400,
      `Ce code requiert un minimum de ${formatCurrency(promo.minOrderAmount, currency)}`
    );
  }

  return { code, discount: computeDiscount(promo, subtotal) };
}

/**
 * Recalcule le montant depuis Firestore, crée le PaymentIntent (destination charge
 * + commission plateforme) et une commande "pending_payment".
 * Retourne le client_secret + l'id de commande.
 */
export async function createPaymentIntentAndOrder(
  input: CreateIntentInput
): Promise<{
  clientSecret: string | null;
  orderId: string;
  free?: boolean;
  // Compte connecté portant la charge (direct charge) — requis côté front pour
  // initialiser Stripe.js sur le bon compte. Absent pour les commandes gratuites.
  connectedAccountId?: string;
}> {
  const { slug, items, customer, customerId } = input;

  if (!items?.length) throw new HttpError(400, "Panier vide");

  // ── Boutique ──────────────────────────────────────────────────
  const storeSnap = await adminDb
    .collection("stores")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (storeSnap.empty) throw new HttpError(404, "Boutique introuvable");
  const storeDoc = storeSnap.docs[0];
  const store = storeDoc.data();
  const storeId = storeDoc.id;

  // Compte Stripe requis seulement si la commande est payante (vérifié plus bas).
  const destination = store.stripeAccountId as string | undefined;
  // Devise de présentation = devise du pays de la boutique (évite la conversion FX
  // côté compte connecté en charge destination).
  const currency = currencyForCountry(store.country as string | undefined);

  // ── Recalcul des lignes depuis les produits (anti-fraude) ─────
  const orderItems = await Promise.all(
    items.map(async (ci) => {
      const prodSnap = await adminDb.collection("products").doc(ci.productId).get();
      if (!prodSnap.exists) throw new HttpError(400, `Produit introuvable: ${ci.productId}`);
      const product = prodSnap.data()!;
      if (product.creatorId !== storeId) {
        throw new HttpError(400, "Produit hors boutique");
      }
      const qty = Math.floor(ci.quantity);
      if (qty < 1) throw new HttpError(400, "Quantité invalide");

      const base = Number(product.price);
      const options = (product.options ?? []) as Array<{
        name: string;
        adjustments?: Record<string, number>;
      }>;
      const price =
        ci.selectedOptions && options.length
          ? options.reduce((total, opt) => {
              const val = ci.selectedOptions![opt.name];
              return total + (opt.adjustments?.[val] ?? 0);
            }, base)
          : base;

      const variantLabel = ci.selectedOptions
        ? Object.values(ci.selectedOptions).join(" — ")
        : undefined;

      return {
        productId: ci.productId,
        name: String(product.name),
        price,
        quantity: qty,
        imageUrl: (product.images?.[0] ?? product.imageUrl ?? "") as string,
        ...(ci.variantId && { variantId: ci.variantId }),
        ...(variantLabel && { variantLabel }),
        ...(ci.customFieldValue && { customFieldValue: ci.customFieldValue }),
      };
    })
  );

  const subtotal = orderItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const method = customer.fulfillmentMethod;

  // ── Géocodage serveur de l'adresse (anti-contournement) ──────────
  // types=address → ville seule rejetée. Sert au rayon (livraison locale) et
  // à la détection du pays de destination (zones d'expédition).
  const needsAddress = method === "local_delivery" || method === "shipping";
  let destCountry: string | null = null;
  if (needsAddress) {
    const geo = customer.address
      ? await geocodeAddress(
          customer.address,
          // L'expédition est mondiale → pas de filtre pays.
          method === "local_delivery" ? (store.country as string | undefined) : undefined
        )
      : null;
    if (!geo) {
      throw new HttpError(400, "Adresse introuvable : sélectionnez-la dans la liste.");
    }
    destCountry = geo.country;
    if (method === "local_delivery") {
      const radiusKm = Number(store.localDeliveryRadiusKm ?? 0);
      const storeLat = store.lat as number | undefined;
      const storeLng = store.lng as number | undefined;
      if (
        radiusKm > 0 &&
        typeof storeLat === "number" &&
        typeof storeLng === "number" &&
        distanceKm({ lat: storeLat, lng: storeLng }, geo) > radiusKm
      ) {
        throw new HttpError(400, "Adresse hors zone de livraison");
      }
    }
  }

  // ── Frais de réception (jamais lus du client) ────────────────────
  let fee = 0;
  let shippingZone: ShippingZone | undefined;
  if (method === "local_delivery") {
    fee = Number(store.localDeliveryFee ?? 0);
  } else if (method === "shipping") {
    const res = shippingFeeFor(store, destCountry);
    if (!res) throw new HttpError(400, "Cette boutique n'expédie pas vers ce pays");
    fee = res.fee;
    shippingZone = res.zone;
  }

  // Code promo (revalidé serveur) — réduction sur le sous-total uniquement.
  const promo = input.promoCode
    ? await validateAndApplyPromo(storeId, input.promoCode, subtotal, currency)
    : null;
  const discount = promo?.discount ?? 0;

  const total = subtotal - discount + fee;
  const amount = toMinorUnits(total, currency);

  const hasAddress = method === "local_delivery" || method === "shipping";
  const hasDate = method === "pickup" || method === "local_delivery";

  const orderRef = adminDb.collection("orders").doc();

  // Champs de commande communs (paiement Stripe ou commande gratuite).
  const baseOrder = {
    storeId,
    customerName: customer.customerName,
    customerPhone: customer.customerPhone,
    customerEmail: customer.customerEmail,
    items: orderItems,
    subtotal,
    total,
    currency,
    ...(promo && { promoCode: promo.code, discount }),
    status: "new" as const,
    fulfillmentMethod: method,
    fulfillmentFee: fee,
    ...(shippingZone && { shippingZone }),
    ...(hasAddress && customer.address && { address: customer.address.trim() }),
    ...(hasAddress && customer.addressComplement?.trim() && { addressComplement: customer.addressComplement.trim() }),
    ...(hasAddress && customer.zipCode && { zipCode: customer.zipCode.trim() }),
    ...(hasAddress && customer.city && { city: customer.city.trim() }),
    ...(hasDate && customer.requestedDate && { requestedDate: customer.requestedDate }),
    ...(hasDate && customer.requestedTime && { requestedTime: customer.requestedTime }),
    ...(customer.note?.trim() && { note: customer.note.trim() }),
    ...(customerId && { customerId }),
    ...(store.name && { storeName: store.name }),
    ...(store.slug && { storeSlug: store.slug }),
    cancellationPolicy: store.cancellationPolicy?.trim() || DEFAULT_CANCELLATION_POLICY,
    cancellationPolicyAccepted: true,
  };

  // ── Commande gratuite (total 0 €) : pas de Stripe. ──────────────
  // On crée la commande déjà payée et on déclenche ici ce que le webhook
  // ferait normalement (compteur promo + emails). Pas de PaymentIntent.
  if (amount <= 0) {
    const now = new Date().toISOString();
    await orderRef.set({
      ...baseOrder,
      paid: true,
      paidAt: now,
      notifiedAt: now,
      applicationFee: 0,
      netAmount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (promo) {
      await adminDb
        .collection("promoCodes")
        .doc(promoDocId(storeId, promo.code))
        .set({ usedCount: FieldValue.increment(1) }, { merge: true });
    }

    // Emails best-effort (les fonctions avalent leurs propres erreurs).
    const emailStore: EmailStore = {
      name: store.name as string | undefined,
      phone: store.phone as string | undefined,
      email: store.email as string | undefined,
      address: store.address as string | undefined,
    };
    const userSnap = await adminDb.collection("users").doc(storeId).get();
    const sellerEmail = userSnap.data()?.email as string | undefined;
    const orderData = { ...baseOrder, paid: true };
    await sendOrderConfirmation(orderRef.id, orderData, emailStore);
    await sendNewOrderAlert(orderRef.id, orderData, emailStore, sellerEmail);

    return { clientSecret: null, orderId: orderRef.id, free: true };
  }

  // ── Paiement Stripe (total > 0) ─────────────────────────────────
  // Stripe refuse les charges sous ~0,50 (50 centimes). On bloque
  // explicitement avec un message clair plutôt que de laisser Stripe échouer.
  if (amount < STRIPE_MIN_AMOUNT) {
    throw new HttpError(
      400,
      `Le montant minimum de paiement est de ${formatCurrency(fromMinorUnits(STRIPE_MIN_AMOUNT, currency), currency)}. Ajustez votre panier.`
    );
  }

  if (!destination || !store.stripeChargesEnabled) {
    throw new HttpError(400, "Cette boutique n'accepte pas encore les paiements");
  }

  // Commission plateforme + net reversé au vendeur (en euros, pour affichage).
  const feeCents = platformFeeAmount(amount);
  const applicationFee = fromMinorUnits(feeCents, currency);
  const netAmount = fromMinorUnits(amount - feeCents, currency);

  // Direct charge : la charge est créée SUR le compte connecté (stripeAccount).
  // application_fee_amount remonte la commission vers la plateforme. Pas de
  // transfer_data (réservé aux destination charges).
  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency,
      application_fee_amount: feeCents,
      receipt_email: customer.customerEmail,
      description: `Commande #${orderRef.id.slice(-8).toUpperCase()} — ${customer.customerName}`,
      metadata: {
        orderId: orderRef.id,
        storeId,
        customerName: customer.customerName,
        customerEmail: customer.customerEmail,
      },
    },
    { idempotencyKey: `pi_${orderRef.id}`, stripeAccount: destination }
  );

  await orderRef.set({
    ...baseOrder,
    paid: false,
    paymentIntentId: intent.id,
    applicationFee,
    netAmount,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    clientSecret: intent.client_secret!,
    orderId: orderRef.id,
    connectedAccountId: destination,
  };
}
