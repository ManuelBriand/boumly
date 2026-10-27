import type { CartItem } from "@/types";
import type { CheckoutInput } from "@/lib/validations/checkout";

export interface CreateIntentResult {
  clientSecret: string | null; // null si commande gratuite (total 0 €)
  orderId: string;
  free?: boolean;              // true → pas de paiement, aller direct à la confirmation
  connectedAccountId?: string; // compte connecté portant la charge (direct charge)
}

/**
 * Crée le PaymentIntent + la commande pending côté serveur.
 * Le montant est recalculé serveur : on n'envoie que les références d'items.
 */
export interface PromoPreview {
  valid: boolean;
  code?: string;
  discount?: number;
  error?: string;
}

/** Aperçu live d'un code promo (réduction estimée). Revalidé au paiement. */
export async function validatePromoCode(args: {
  slug: string;
  code: string;
  subtotal: number;
}): Promise<PromoPreview> {
  const res = await fetch("/api/checkout/promo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return (await res.json()) as PromoPreview;
}

export async function createCheckoutPaymentIntent(args: {
  slug: string;
  items: CartItem[];
  customer: CheckoutInput;
  customerId?: string;
  promoCode?: string;
}): Promise<CreateIntentResult> {
  const items = args.items.map((ci) => ({
    productId: ci.product.id,
    quantity: ci.quantity,
    ...(ci.selectedOptions && { selectedOptions: ci.selectedOptions }),
    ...(ci.variantId && { variantId: ci.variantId }),
    ...(ci.customFieldValue && { customFieldValue: ci.customFieldValue }),
  }));

  const res = await fetch("/api/checkout/payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: args.slug,
      items,
      customer: args.customer,
      ...(args.customerId && { customerId: args.customerId }),
      ...(args.promoCode && { promoCode: args.promoCode }),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur paiement");
  return data as CreateIntentResult;
}
