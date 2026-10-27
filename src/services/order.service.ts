import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order, OrderStatus, CartItem } from "@/types";
import type { CheckoutInput } from "@/lib/validations/checkout";

export interface CreateOrderInput {
  storeId: string;
  customer: CheckoutInput;
  items: CartItem[];
  fulfillmentFee?: number;
  customerId?: string;     // uid client connecté (sinon anonyme)
  storeName?: string;      // snapshot boutique pour l'historique client
  storeSlug?: string;
}

export async function createOrder({
  storeId,
  customer,
  items,
  fulfillmentFee = 0,
  customerId,
  storeName,
  storeSlug,
}: CreateOrderInput): Promise<string> {
  const orderItems = items.map((ci) => {
    // Prix = base + somme des ajustements par option sélectionnée
    const base = ci.product.price;
    const price = ci.selectedOptions && ci.product.options?.length
      ? ci.product.options.reduce((total, opt) => {
          const val = ci.selectedOptions![opt.name];
          return total + (opt.adjustments?.[val] ?? 0);
        }, base)
      : base;
    const variantLabel = ci.selectedOptions
      ? Object.values(ci.selectedOptions).join(" — ")
      : undefined;
    return {
      productId: ci.product.id,
      name: ci.product.name,
      price,
      quantity: ci.quantity,
      imageUrl: ci.product.images?.[0] ?? ci.product.imageUrl,
      ...(ci.variantId && { variantId: ci.variantId }),
      ...(variantLabel && { variantLabel }),
      ...(ci.customFieldValue && { customFieldValue: ci.customFieldValue }),
    };
  });

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const method = customer.fulfillmentMethod;
  const fee = method === "pickup" ? 0 : fulfillmentFee;
  const hasAddress = method === "local_delivery" || method === "shipping";
  const hasDate = method === "pickup" || method === "local_delivery";

  const ref = await addDoc(collection(db, "orders"), {
    storeId,
    customerName: customer.customerName,
    customerPhone: customer.customerPhone,
    customerEmail: customer.customerEmail,
    items: orderItems,
    subtotal,
    total: subtotal + fee,
    status: "new" as OrderStatus,
    fulfillmentMethod: method,
    fulfillmentFee: fee,
    ...(hasAddress && customer.address && { address: customer.address.trim() }),
    ...(hasAddress && customer.zipCode && { zipCode: customer.zipCode.trim() }),
    ...(hasAddress && customer.city && { city: customer.city.trim() }),
    ...(hasDate && customer.requestedDate && { requestedDate: customer.requestedDate }),
    ...(hasDate && customer.requestedTime && { requestedTime: customer.requestedTime }),
    ...(customerId && { customerId }),
    ...(storeName && { storeName }),
    ...(storeSlug && { storeSlug }),
    createdAt: Timestamp.now(),
  });

  return ref.id;
}

// Lecture via route serveur (Admin SDK) : les règles Firestore bloquent la
// lecture client des commandes pour les visiteurs anonymes (page de confirmation).
export async function getOrderById(orderId: string): Promise<Order | null> {
  const res = await fetch(`/api/orders/${orderId}`);
  if (!res.ok) return null;
  return (await res.json()) as Order;
}

export function subscribeToOrders(
  storeId: string,
  callback: (orders: Order[]) => void
) {
  const q = query(
    collection(db, "orders"),
    where("storeId", "==", storeId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const orders = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Order))
      // masque les commandes en attente de paiement en ligne (webhook/brouillon).
      // Les commandes "sans encaissement" (payment:"none") restent visibles.
      .filter((o) => o.paid !== false || o.payment === "none");
    callback(orders);
  });
}

// Nom + téléphone de la dernière commande du client → préremplissage checkout.
// Pas d'orderBy (évite un index composite) : tri client-side comme ailleurs.
export async function getLatestCustomerContact(
  customerId: string
): Promise<{ name?: string; phone?: string } | null> {
  const q = query(collection(db, "orders"), where("customerId", "==", customerId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const orders = snap.docs
    .map((d) => d.data() as Order)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  const last = orders.find((o) => o.customerName || o.customerPhone) ?? orders[0];
  return { name: last.customerName, phone: last.customerPhone };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await updateDoc(doc(db, "orders", orderId), { status });
}

// Historique commandes d'un client (toutes boutiques confondues)
export function subscribeCustomerOrders(
  customerId: string,
  callback: (orders: Order[]) => void
) {
  const q = query(collection(db, "orders"), where("customerId", "==", customerId));
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Order))
        .filter((o) => o.paid !== false || o.payment === "none");
      // tri client-side pour éviter un index composite
      orders.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      callback(orders);
    },
    (err) => console.error("[subscribeCustomerOrders]", err.code, err.message)
  );
}
