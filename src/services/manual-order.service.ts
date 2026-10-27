import type { User } from "firebase/auth";
import type {
  ManualOrderItem,
  ManualOrderCustomer,
  ManualPayment,
} from "@/lib/manual-order-server";

export interface ManualOrderResult {
  orderId: string;
  slug: string;
  mode: ManualPayment;
  emailed?: boolean; // mode online : true si le lien a bien été envoyé par email
}

/**
 * Étape 1 (vendeur). `payment:"online"` → brouillon + lien ; `cash`/`none` →
 * commande finalisée (customer requis).
 */
export async function createManualOrder(
  user: User,
  payload: {
    items: ManualOrderItem[];
    note?: string;
    payment: ManualPayment;
    customer?: ManualOrderCustomer;
    customerEmail?: string;
    locale?: string;
  }
): Promise<ManualOrderResult> {
  const token = await user.getIdToken();
  const res = await fetch("/api/orders/manual", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur création commande");
  return data as ManualOrderResult;
}

export interface OrderDraft {
  paid: boolean;
  subtotal: number;
  storeName: string | null;
  storeSlug: string | null;
  note: string | null;
  items: { name: string; quantity: number; price: number; variantLabel: string | null }[];
}

/** Lit le brouillon d'une commande (public, via le lien). */
export async function getOrderDraft(orderId: string): Promise<OrderDraft> {
  const res = await fetch(`/api/orders/${orderId}/pay`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Commande introuvable");
  return data as OrderDraft;
}

/** Étape 2 (client) : finalise livraison + coordonnées → renvoie le client_secret. */
export async function finalizeManualOrderPayment(
  orderId: string,
  payload: { customer: ManualOrderCustomer; customerId?: string }
): Promise<{ clientSecret: string; connectedAccountId: string }> {
  const res = await fetch(`/api/orders/${orderId}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur paiement");
  return data as { clientSecret: string; connectedAccountId: string };
}
