import {
  isSupported,
  getAnalytics,
  logEvent,
  type Analytics,
} from "firebase/analytics";
import { app } from "@/lib/firebase";
import type { CartItem } from "@/types";

// Article au format GA4 (e-commerce).
export interface GAItem {
  item_id?: string;
  item_name: string;
  price: number;
  quantity?: number;
}

const DEFAULT_CURRENCY = "EUR";
const ga4Currency = (c?: string) => (c ?? DEFAULT_CURRENCY).toUpperCase();

// Init paresseuse + sûre : navigateur uniquement, measurementId requis,
// isSupported() (bloque Safari ITP / environnements non compatibles).
// Tous les helpers sont no-op si l'analytics n'est pas disponible.
let analyticsPromise: Promise<Analytics | null> | null = null;

function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((ok) => (ok ? getAnalytics(app) : null))
      .catch(() => null);
  }
  return analyticsPromise;
}

async function track(event: string, params?: Record<string, unknown>) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, event, params);
}

/** Mappe le panier vers des items GA4 ; `priceOf` calcule le prix unitaire. */
export function buildCartItems(
  items: CartItem[],
  priceOf: (i: CartItem) => number
): GAItem[] {
  return items.map((i) => ({
    item_id: i.product.id,
    item_name: i.product.name,
    price: priceOf(i),
    quantity: i.quantity,
  }));
}

export function trackPageView(path: string, title?: string) {
  track("page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
    ...(title ? { page_title: title } : {}),
  });
}

export function trackViewItem(
  p: { id: string; name: string; price: number },
  currency?: string
) {
  track("view_item", {
    currency: ga4Currency(currency),
    value: p.price,
    items: [{ item_id: p.id, item_name: p.name, price: p.price }],
  });
}

export function trackAddToCart(
  p: {
    id: string;
    name: string;
    price: number;
    quantity?: number;
  },
  currency?: string
) {
  const qty = p.quantity ?? 1;
  track("add_to_cart", {
    currency: ga4Currency(currency),
    value: p.price * qty,
    items: [{ item_id: p.id, item_name: p.name, price: p.price, quantity: qty }],
  });
}

export function trackBeginCheckout(value: number, items: GAItem[], currency?: string) {
  track("begin_checkout", { currency: ga4Currency(currency), value, items });
}

export function trackPurchase(p: {
  orderId: string;
  value: number;
  items: GAItem[];
  coupon?: string;
  currency?: string;
}) {
  track("purchase", {
    transaction_id: p.orderId,
    currency: ga4Currency(p.currency),
    value: p.value,
    items: p.items,
    ...(p.coupon ? { coupon: p.coupon } : {}),
  });
}

export function trackLogin(method: string) {
  track("login", { method });
}

export function trackSignUp(method: string) {
  track("sign_up", { method });
}
