"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Minus, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { getCartItemKey } from "@/contexts/CartContext";
import { CartBar } from "@/features/store/CartBar";
import { CartDrawer } from "@/features/store/CartDrawer";
import { StoreHeader } from "@/features/store/StoreHeader";
import { MarketBadges } from "@/features/store/MarketBadges";
import { formatCurrency } from "@/lib/utils";
import { trackViewItem } from "@/lib/analytics";
import type { Product, ProductVariant, Store } from "@/types";
import type { ExhibitorEventBadge } from "@/lib/event-server";

interface Props {
  product: Product;
  store: Store | null;
  slug: string;
  exhibitorEvents?: ExhibitorEventBadge[];
}

export function ProductDetailClient({ product, store, slug, exhibitorEvents = [] }: Props) {
  const router = useRouter();
  const t = useTranslations("productDetail");
  const tp = useTranslations("store.product");
  const { items, addItem, removeItem, updateQuantity, currency, locale } = useCart();

  const [cartOpen, setCartOpen] = useState(false);

  // Gallery
  const [imgIdx, setImgIdx] = useState(0);

  // Options selection
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [customValue, setCustomValue] = useState("");

  // Shake animation state for unselected options
  const [shakeGroups, setShakeGroups] = useState<string[]>([]);
  const optionsRef = useRef<HTMLDivElement>(null);

  // view_item dès que le produit est affiché.
  useEffect(() => {
    trackViewItem({ id: product.id, name: product.name, price: product.price }, currency);
  }, [product, currency]);

  const images = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const hasOptions = product.options?.length > 0;
  const hasVariants = product.variants?.length > 0;

  // Match variant
  const matchedVariant: ProductVariant | undefined = hasVariants
    ? product.variants.find(
        (v) =>
          v.enabled &&
          product.options.every((opt) => v.options[opt.name] === selectedOptions[opt.name])
      )
    : undefined;

  const allOptionsSelected =
    !hasOptions || product.options.every((opt) => selectedOptions[opt.name] !== undefined);

  // Prix = base + somme des ajustements sélectionnés
  const displayPrice = product.options.reduce((total, opt) => {
    const val = selectedOptions[opt.name];
    return total + (opt.adjustments?.[val] ?? 0);
  }, product.price);

  const showFromPrice = hasOptions && !allOptionsSelected;

  // Ajustement de prix pour une valeur d'option donnée
  function getValuePriceDiff(optName: string, val: string): number | null {
    if (!hasOptions) return null;
    const opt = product.options.find((o) => o.name === optName);
    if (!opt) return null;
    const adj = opt.adjustments?.[val] ?? 0;
    return adj === 0 ? null : adj;
  }

  const outOfStock = (() => {
    if (hasVariants && matchedVariant) return matchedVariant.stock !== null && matchedVariant.stock === 0;
    if (hasVariants) return false;
    return product.trackStock && (product.stock ?? null) === 0;
  })();

  const lowStock = (() => {
    if (outOfStock) return null;
    if (hasVariants && matchedVariant && matchedVariant.stock !== null && matchedVariant.stock > 0 && matchedVariant.stock <= 5) return matchedVariant.stock;
    if (!hasVariants && product.trackStock && product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5) return product.stock;
    return null;
  })();

  const customRequired = product.customField?.required;
  const customFieldMissing = customRequired && !customValue.trim();
  const canAdd = allOptionsSelected && !outOfStock && !customFieldMissing;

  // Boutique pas encore vendable (Stripe non activé) → ajout au panier bloqué.
  const blocked = !!store && store.stripeChargesEnabled !== true;

  // Clé panier basée sur le variantId (si variante correspondante) ou les options sélectionnées
  const cartItemVarId = matchedVariant?.id;
  const cartKey = cartItemVarId
    ? `${product.id}_${cartItemVarId}`
    : !hasOptions ? product.id : undefined;
  const cartItem = cartKey ? items.find((i) => getCartItemKey(i) === cartKey) : undefined;

  function handleAdd() {
    if (blocked) return;
    if (!allOptionsSelected) {
      const missing = product.options
        .filter((opt) => !selectedOptions[opt.name])
        .map((opt) => opt.name);
      setShakeGroups(missing);
      setTimeout(() => setShakeGroups([]), 600);
      optionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (outOfStock || customFieldMissing) return;
    addItem(product, {
      variantId: matchedVariant?.id,
      selectedOptions: hasOptions ? selectedOptions : undefined,
      customFieldValue: product.customField ? customValue : undefined,
    });
    toast.success(t("addedToCart"));
  }

  function handleDecrement() {
    if (!cartItem || !cartKey) return;
    if (cartItem.quantity === 1) removeItem(cartKey);
    else updateQuantity(cartKey, cartItem.quantity - 1);
  }
  function handleIncrement() {
    if (!cartItem || !cartKey) return;
    updateQuantity(cartKey, cartItem.quantity + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {store ? (
        // Contexte boutique : header cliquable (retour boutique) + chips marchés.
        <>
          <StoreHeader store={store} href={`/store/${slug}`} />
          <MarketBadges events={exhibitorEvents} />
        </>
      ) : (
        // Fallback (boutique introuvable) : simple flèche retour.
        <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">

          {/* ── Gallery ──────────────────────────────────── */}
          <div className="mb-6 lg:mb-0 lg:sticky lg:top-6">
            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                  <Image
                    src={images[imgIdx]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow hover:bg-white transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow hover:bg-white transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIdx(i)}
                        className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden ring-2 transition-all ${
                          i === imgIdx ? "ring-primary" : "ring-border hover:ring-primary/40"
                        }`}
                      >
                        <Image src={src} alt={`${i + 1}`} fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square rounded-2xl bg-muted flex items-center justify-center text-7xl">
                📦
              </div>
            )}
          </div>

          {/* ── Details ───────────────────────────────────── */}
          <div className="space-y-5">
            {/* Name + price */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
              {product.description && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Options */}
            {hasOptions && (
              <div ref={optionsRef} className="space-y-4">
                {product.options.map((opt) => {
                  const isSelected = selectedOptions[opt.name] !== undefined;
                  const isShaking = shakeGroups.includes(opt.name);

                  return (
                    <div
                      key={opt.name}
                      className={`rounded-2xl border p-4 transition-all ${
                        isSelected ? "border-green-300 bg-green-50/30" : "border-orange-300 bg-orange-50/20"
                      } ${isShaking ? "animate-bounce" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-foreground">{opt.name}</p>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            <Check className="h-3 w-3" />
                            {t("selected")}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {t("required")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {opt.values.map((val) => {
                          const isValSelected = selectedOptions[opt.name] === val;
                          const variantExists = !hasVariants || product.variants.some(
                            (v) => v.enabled && v.options[opt.name] === val
                          );
                          const priceDiff = getValuePriceDiff(opt.name, val);
                          const showDiff = priceDiff !== null && priceDiff !== 0;
                          return (
                            <button
                              key={val}
                              type="button"
                              disabled={!variantExists}
                              onClick={() => setSelectedOptions((prev) => ({ ...prev, [opt.name]: val }))}
                              className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl border-2 transition-all min-h-[44px] ${
                                isValSelected
                                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                  : variantExists
                                  ? "bg-white text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                                  : "bg-muted text-muted-foreground border-border opacity-40 cursor-not-allowed line-through"
                              }`}
                            >
                              <span className="text-sm font-semibold">{val}</span>
                              {showDiff && (
                                <span className={`text-[10px] font-bold leading-none mt-0.5 ${
                                  isValSelected ? "text-white/80" : priceDiff > 0 ? "text-primary" : "text-green-600"
                                }`}>
                                  {priceDiff > 0 ? `+${formatCurrency(priceDiff, currency, locale)}` : formatCurrency(priceDiff, currency, locale)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {!allOptionsSelected && (
                  <p className="text-xs text-orange-600 flex items-center gap-1.5 font-medium">
                    <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">!</span>
                    {t("selectAllOptions")}
                  </p>
                )}
              </div>
            )}

            {/* Custom field */}
            {product.customField && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground">
                  {product.customField.label}
                  {product.customField.required && <span className="text-primary ml-1">*</span>}
                </label>
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder={t("customPlaceholder")}
                  className="w-full h-11 px-4 rounded-xl border-2 border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            )}

            {/* Stock */}
            {outOfStock && (
              <p className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {tp("outOfStock")}
              </p>
            )}
            {!outOfStock && lowStock !== null && (
              <p className="text-sm font-semibold text-orange-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                {tp("lowStock", { count: lowStock })}
              </p>
            )}

            {/* Price */}
            <div>
              <p className="text-3xl font-black text-primary">
                {showFromPrice && (
                  <span className="text-base font-normal text-muted-foreground mr-2">{tp("from")}</span>
                )}
                {formatCurrency(displayPrice, currency, locale)}
              </p>
            </div>

            {/* Desktop add to cart */}
            <div className="hidden lg:block">
              {blocked ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                  {t("storeNotReady")}
                </div>
              ) : cartItem && cartKey ? (
                <div className="flex items-center gap-4 rounded-2xl border border-border p-4 bg-white">
                  <span className="text-sm font-semibold text-foreground flex-1">{t("inCart")}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={handleDecrement}
                      className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-lg">{cartItem.quantity}</span>
                    <button onClick={handleIncrement}
                      className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  disabled={outOfStock}
                  className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                    canAdd
                      ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 hover:-translate-y-0.5"
                      : outOfStock
                      ? "bg-red-50 text-red-400 cursor-not-allowed"
                      : "bg-orange-50 text-orange-700 border-2 border-orange-300 hover:bg-orange-100"
                  }`}
                >
                  {outOfStock ? (
                    tp("outOfStock")
                  ) : !allOptionsSelected ? (
                    <>
                      {t("chooseOptions")}
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      {t("addToCart")}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{t("price")}</p>
          <p className="font-black text-lg text-primary">
            {showFromPrice && <span className="text-xs font-normal text-muted-foreground mr-1">{tp("from")}</span>}
            {formatCurrency(displayPrice, currency, locale)}
          </p>
        </div>

        {blocked ? (
          <span className="max-w-[55%] shrink-0 text-right text-xs font-medium text-amber-700">
            {t("storeNotReady")}
          </span>
        ) : cartItem && cartKey ? (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleDecrement}
              className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-bold text-lg">{cartItem.quantity}</span>
            <button onClick={handleIncrement}
              className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className={`h-12 px-6 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shrink-0 ${
              canAdd
                ? "bg-primary text-white hover:bg-primary/90 shadow-md"
                : outOfStock
                ? "bg-red-50 text-red-400 cursor-not-allowed"
                : "bg-orange-100 text-orange-700 border-2 border-orange-300"
            }`}
          >
            {outOfStock ? tp("outOfStock") : !allOptionsSelected ? t("chooseShort") : (
              <><Plus className="h-4 w-4" />{tp("add")}</>
            )}
          </button>
        )}
      </div>

      {!blocked && (
        <>
          <CartBar onOpen={() => setCartOpen(true)} />
          <CartDrawer open={cartOpen} onOpenChange={setCartOpen} slug={slug} />
        </>
      )}
    </div>
  );
}
