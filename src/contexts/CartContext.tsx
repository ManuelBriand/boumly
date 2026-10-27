"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "@/types";
import { trackAddToCart } from "@/lib/analytics";

interface AddItemOptions {
  variantId?: string;
  selectedOptions?: Record<string, string>;
  customFieldValue?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (product: Product, opts?: AddItemOptions) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  getItemPrice: (item: CartItem) => number;
  currency: string; // devise de la boutique (ISO 4217 minuscule)
  locale: string;   // locale d'affichage (next-intl) pour le formatage monétaire
}

const CartContext = createContext<CartContextValue>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0,
  count: 0,
  getItemPrice: () => 0,
  currency: "eur",
  locale: "fr",
});

const CART_KEY = "boumly_cart";

// Unique key per cart line (product + variant combo)
function cartItemKey(productId: string, variantId?: string) {
  return variantId ? `${productId}_${variantId}` : productId;
}

export function getCartItemKey(item: CartItem) {
  return cartItemKey(item.product.id, item.variantId);
}

export function getItemPrice(item: CartItem): number {
  const base = item.product.price;
  if (!item.selectedOptions || !item.product.options?.length) return base;
  return item.product.options.reduce((total, opt) => {
    const val = item.selectedOptions![opt.name];
    return total + (opt.adjustments?.[val] ?? 0);
  }, base);
}

export function CartProvider({
  storeId,
  currency = "eur",
  locale = "fr",
  children,
}: {
  storeId: string;
  currency?: string;
  locale?: string;
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${CART_KEY}_${storeId}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation depuis localStorage après le montage (absent au rendu serveur)
      if (stored) setItems(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, [storeId]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(`${CART_KEY}_${storeId}`, JSON.stringify(items));
  }, [items, storeId, hydrated]);

  const addItem = useCallback((product: Product, opts?: AddItemOptions) => {
    const variantId = opts?.variantId;
    const key = cartItemKey(product.id, variantId);

    trackAddToCart(
      {
        id: product.id,
        name: product.name,
        price: getItemPrice({
          product,
          quantity: 1,
          variantId,
          selectedOptions: opts?.selectedOptions,
        }),
        quantity: 1,
      },
      currency
    );

    setItems((prev) => {
      const existing = prev.find((i) => getCartItemKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          getCartItemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          variantId,
          selectedOptions: opts?.selectedOptions,
          customFieldValue: opts?.customFieldValue,
        },
      ];
    });
  }, [currency]);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => getCartItemKey(i) !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => getCartItemKey(i) !== key));
    } else {
      setItems((prev) =>
        prev.map((i) => (getCartItemKey(i) === key ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + getItemPrice(i) * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count, getItemPrice, currency, locale }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  return useContext(CartContext);
}
