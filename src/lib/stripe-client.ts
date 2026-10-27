import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Singleton par compte connecté. En direct charge, le PaymentIntent vit sur le
// compte connecté : Stripe.js doit être initialisé avec { stripeAccount } pour
// que les Elements et confirmPayment ciblent ce compte. On mémorise une instance
// par accountId (clé "" = plateforme, fallback).
const cache = new Map<string, Promise<Stripe | null>>();

export function getStripe(stripeAccount?: string): Promise<Stripe | null> {
  const key = stripeAccount ?? "";
  let promise = cache.get(key);
  if (!promise) {
    promise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      stripeAccount ? { stripeAccount } : undefined
    );
    cache.set(key, promise);
  }
  return promise;
}
