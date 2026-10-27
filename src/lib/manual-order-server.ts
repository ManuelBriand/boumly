import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripe, platformFeeAmount } from "@/lib/stripe";
import { HttpError } from "@/lib/server-auth";
import { sendOrderConfirmation, sendManualPayLink } from "@/lib/emails/send";
import { geocodeAddress } from "@/lib/geo";
import { zoneForDestination, type ShippingZone } from "@/lib/regions";
import { currencyForCountry, toMinorUnits, fromMinorUnits } from "@/lib/countries";
import type { EmailStore } from "@/lib/emails/templates";
import type { FulfillmentMethod } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// Construit l'EmailStore depuis une donnée boutique Firestore brute.
function emailStore(store: Record<string, unknown>): EmailStore {
  return {
    name: store.name as string | undefined,
    phone: store.phone as string | undefined,
    email: store.email as string | undefined,
    address: store.address as string | undefined,
  };
}

// ─── Entrées (deux types d'articles) ──────────────────────────────
export interface ManualCatalogItem {
  kind: "product";
  productId: string;
  quantity: number;
  selectedOptions?: Record<string, string>;
  variantId?: string;
}
export interface ManualCustomItem {
  kind: "custom";
  name: string;
  price: number;
  quantity: number;
}
export type ManualOrderItem = ManualCatalogItem | ManualCustomItem;

export type ManualPayment = "online" | "cash" | "none";

// Coordonnées + livraison. Fournies par le CLIENT (lien) ou par le VENDEUR (offline).
export interface ManualOrderCustomer {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: string;
  addressComplement?: string;
  zipCode?: string;
  city?: string;
  requestedDate?: string;
  requestedTime?: string;
  note?: string;
}


type ShippingZonesConfig = Partial<
  Record<ShippingZone, { enabled: boolean; fee: number }>
>;

/**
 * Frais de réception pour une commande manuelle. L'expédition est tarifée par
 * palier (pays de destination détecté via l'adresse). Vendeur de confiance :
 * pas de blocage si la zone est désactivée (frais = 0, ajustables à la main).
 */
async function feeFor(
  store: Record<string, unknown>,
  customer: ManualOrderCustomer
): Promise<{ fee: number; shippingZone?: ShippingZone }> {
  const method = customer.fulfillmentMethod;
  if (method === "local_delivery") return { fee: Number(store.localDeliveryFee ?? 0) };
  if (method !== "shipping") return { fee: 0 };

  let destCountry: string | null = null;
  if (customer.address) {
    const geo = await geocodeAddress(customer.address);
    destCountry = geo?.country ?? null;
  }
  const zone = zoneForDestination(store.country as string | undefined, destCountry);
  const zones = store.shippingZones as ShippingZonesConfig | undefined;
  if (!zones) return { fee: Number(store.shippingFee ?? 0), shippingZone: zone };
  const z = zones[zone];
  return { fee: z?.enabled ? Number(z.fee ?? 0) : 0, shippingZone: zone };
}

/**
 * Étape 1 (vendeur) : crée une commande manuelle.
 * - `payment:"online"` → BROUILLON (articles seulement, `status:"draft"`). Le client
 *   choisit livraison + coordonnées via le lien (étape 2).
 * - `payment:"cash"|"none"` → commande FINALISÉE directement (le vendeur fournit
 *   client + livraison), sans Stripe. `cash` → `paid:true`, `none` → `paid:false`.
 */
export async function createManualOrder(input: {
  uid: string;
  items: ManualOrderItem[];
  note?: string;
  payment: ManualPayment;
  customer?: ManualOrderCustomer;
  customerEmail?: string; // mode online : email facultatif pour envoyer le lien de paiement
  locale?: string; // langue de l'app — préfixe le lien de paiement (/fr, /en)
}): Promise<{ orderId: string; slug: string; mode: ManualPayment; emailed?: boolean }> {
  const { uid, items, note, payment, customer, customerEmail, locale } = input;
  const lang = locale === "en" ? "en" : "fr";
  if (!items?.length) throw new HttpError(400, "Aucun article");

  const storeSnap = await adminDb.collection("stores").doc(uid).get();
  if (!storeSnap.exists) throw new HttpError(404, "Boutique introuvable");
  const store = storeSnap.data()!;
  const storeId = storeSnap.id;
  const currency = currencyForCountry(store.country as string | undefined);

  if (!store.stripeAccountId || !store.stripeChargesEnabled) {
    throw new HttpError(400, "Activez les paiements avant de créer une commande");
  }

  const orderItems = await Promise.all(
    items.map(async (it) => {
      const qty = Math.floor(it.quantity);
      if (qty < 1) throw new HttpError(400, "Quantité invalide");

      if (it.kind === "custom") {
        const name = it.name?.trim();
        if (!name) throw new HttpError(400, "Nom d'article requis");
        const price = Number(it.price);
        if (!(price >= 0)) throw new HttpError(400, "Prix invalide");
        return { name, price, quantity: qty, imageUrl: "" };
      }

      const prodSnap = await adminDb.collection("products").doc(it.productId).get();
      if (!prodSnap.exists) throw new HttpError(400, `Produit introuvable: ${it.productId}`);
      const product = prodSnap.data()!;
      if (product.creatorId !== storeId) throw new HttpError(400, "Produit hors boutique");

      const base = Number(product.price);
      const options = (product.options ?? []) as Array<{
        name: string;
        adjustments?: Record<string, number>;
      }>;
      const price =
        it.selectedOptions && options.length
          ? options.reduce((total, opt) => {
              const val = it.selectedOptions![opt.name];
              return total + (opt.adjustments?.[val] ?? 0);
            }, base)
          : base;
      const variantLabel = it.selectedOptions
        ? Object.values(it.selectedOptions).join(" — ")
        : undefined;

      return {
        productId: it.productId,
        name: String(product.name),
        price,
        quantity: qty,
        imageUrl: (product.images?.[0] ?? product.imageUrl ?? "") as string,
        ...(it.variantId && { variantId: it.variantId }),
        ...(variantLabel && { variantLabel }),
      };
    })
  );

  const subtotal = orderItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const orderRef = adminDb.collection("orders").doc();

  // ── Mode en ligne : brouillon, le client finalise via le lien ──
  if (payment === "online") {
    const email = customerEmail?.trim();
    const draft = {
      storeId,
      items: orderItems,
      subtotal,
      currency,
      status: "draft",
      paid: false,
      manual: true,
      payment: "online",
      ...(email && { customerEmail: email }),
      ...(note?.trim() && { note: note.trim() }),
      ...(store.name && { storeName: store.name }),
      ...(store.slug && { storeSlug: store.slug }),
      createdAt: FieldValue.serverTimestamp(),
    };
    await orderRef.set(draft);

    // Si un email client est fourni, on lui envoie directement le lien de paiement.
    let emailed = false;
    if (email) {
      const payUrl = `${APP_URL}/${lang}/store/${String(store.slug)}/pay/${orderRef.id}`;
      const r = await sendManualPayLink(orderRef.id, draft, emailStore(store), payUrl);
      emailed = r.ok;
    }

    return { orderId: orderRef.id, slug: String(store.slug), mode: "online", emailed };
  }

  // ── Mode offline (cash / none) : commande finalisée, sans Stripe ──
  if (!customer) throw new HttpError(400, "Coordonnées client requises");
  if (!customer.customerName?.trim()) throw new HttpError(400, "Nom client requis");
  if (!customer.customerPhone?.trim()) throw new HttpError(400, "Téléphone client requis");
  if (!customer.customerEmail?.trim()) throw new HttpError(400, "Email client requis");

  const method = customer.fulfillmentMethod;
  const { fee, shippingZone } = await feeFor(store, customer);
  const total = subtotal + fee;
  const hasAddress = method === "local_delivery" || method === "shipping";
  const hasDate = method === "pickup" || method === "local_delivery";

  const finalized = {
    storeId,
    items: orderItems,
    subtotal,
    total,
    currency,
    status: "new",
    paid: payment === "cash",
    manual: true,
    payment,
    customerName: customer.customerName.trim(),
    customerPhone: customer.customerPhone.trim(),
    ...(customer.customerEmail?.trim() && { customerEmail: customer.customerEmail.trim() }),
    fulfillmentMethod: method,
    fulfillmentFee: fee,
    ...(shippingZone && { shippingZone }),
    ...(hasAddress && customer.address && { address: customer.address.trim() }),
    ...(hasAddress && customer.addressComplement?.trim() && { addressComplement: customer.addressComplement.trim() }),
    ...(hasAddress && customer.zipCode && { zipCode: customer.zipCode.trim() }),
    ...(hasAddress && customer.city && { city: customer.city.trim() }),
    ...(hasDate && customer.requestedDate && { requestedDate: customer.requestedDate }),
    ...(hasDate && customer.requestedTime && { requestedTime: customer.requestedTime }),
    ...(note?.trim() && { note: note.trim() }),
    ...(store.name && { storeName: store.name }),
    ...(store.slug && { storeSlug: store.slug }),
    createdAt: FieldValue.serverTimestamp(),
  };
  await orderRef.set(finalized);

  // Confirmation au client (email obligatoire ici). Pas d'alerte vendeur : c'est lui qui crée.
  await sendOrderConfirmation(orderRef.id, finalized, emailStore(store));

  return { orderId: orderRef.id, slug: String(store.slug), mode: payment };
}

/**
 * Étape 2 (client, via le lien) : le client a choisi la livraison + ses coordonnées.
 * Recalcule le total depuis les articles stockés + frais du mode choisi, crée/maj
 * le PaymentIntent et complète la commande. Retourne le client_secret.
 */
export async function finalizeManualOrderPayment(input: {
  orderId: string;
  customer: ManualOrderCustomer;
  customerId?: string;
}): Promise<{ clientSecret: string; connectedAccountId: string }> {
  const { orderId, customer, customerId } = input;

  const orderRef = adminDb.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpError(404, "Commande introuvable");
  const order = orderSnap.data()!;
  if (order.paid === true) throw new HttpError(400, "Commande déjà réglée");

  const storeSnap = await adminDb.collection("stores").doc(order.storeId).get();
  if (!storeSnap.exists) throw new HttpError(404, "Boutique introuvable");
  const store = storeSnap.data()!;
  const destination = store.stripeAccountId as string | undefined;
  if (!destination || !store.stripeChargesEnabled) {
    throw new HttpError(400, "Cette boutique n'accepte pas les paiements");
  }
  // Devise figée au brouillon ; fallback sur le pays pour les commandes legacy.
  const currency =
    (order.currency as string | undefined) ??
    currencyForCountry(store.country as string | undefined);

  const items = (order.items ?? []) as Array<{ price: number; quantity: number }>;
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);

  const method = customer.fulfillmentMethod;
  const { fee, shippingZone } = await feeFor(store, customer);
  const total = subtotal + fee;
  const amount = toMinorUnits(total, currency);
  if (amount < 1) throw new HttpError(400, "Montant invalide");

  const feeCents = platformFeeAmount(amount);
  const applicationFee = fromMinorUnits(feeCents, currency);
  const netAmount = fromMinorUnits(amount - feeCents, currency);

  // PI : maj si déjà créé (le client peut changer de mode → montant différent),
  // sinon création.
  // Direct charge : PI créé/maj SUR le compte connecté (stripeAccount). Pas de
  // transfer_data ; application_fee_amount remonte la commission plateforme.
  const existingPi = order.paymentIntentId as string | undefined;
  const intent = existingPi
    ? await stripe.paymentIntents.update(
        existingPi,
        {
          amount,
          application_fee_amount: feeCents,
          ...(customer.customerEmail && { receipt_email: customer.customerEmail }),
          description: `Commande #${orderId.slice(-8).toUpperCase()} — ${customer.customerName}`,
          metadata: {
            orderId,
            storeId: order.storeId,
            customerName: customer.customerName,
            ...(customer.customerEmail && { customerEmail: customer.customerEmail }),
          },
        },
        { stripeAccount: destination }
      )
    : await stripe.paymentIntents.create(
        {
          amount,
          currency,
          application_fee_amount: feeCents,
          ...(customer.customerEmail && { receipt_email: customer.customerEmail }),
          description: `Commande #${orderId.slice(-8).toUpperCase()} — ${customer.customerName}`,
          metadata: {
            orderId,
            storeId: order.storeId,
            customerName: customer.customerName,
            ...(customer.customerEmail && { customerEmail: customer.customerEmail }),
          },
        },
        { idempotencyKey: `pi_${orderId}`, stripeAccount: destination }
      );

  const hasAddress = method === "local_delivery" || method === "shipping";
  const hasDate = method === "pickup" || method === "local_delivery";

  await orderRef.set(
    {
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      ...(customer.customerEmail && { customerEmail: customer.customerEmail }),
      total,
      currency,
      status: "new",
      payment: "online",
      paymentIntentId: intent.id,
      applicationFee,
      netAmount,
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
    },
    { merge: true }
  );

  return { clientSecret: intent.client_secret!, connectedAccountId: destination };
}
