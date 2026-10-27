"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus, Minus, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { getCartItemKey } from "@/contexts/CartContext";
import type { Product } from "@/types";

interface StoreProductCardProps {
  product: Product;
}

export function StoreProductCard({ product }: StoreProductCardProps) {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const t = useTranslations("store.product");
  const { items, addItem, removeItem, updateQuantity, currency, locale } = useCart();

  // Images gallery
  const images = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const [imgIdx, setImgIdx] = useState(0);

  const hasOptions = product.options?.length > 0;

  // Simple product cart logic (no options)
  const cartKey = !hasOptions ? product.id : undefined;
  const cartItem = cartKey ? items.find((i) => getCartItemKey(i) === cartKey) : undefined;

  const outOfStock =
    !hasOptions &&
    product.trackStock &&
    (product.stock ?? null) === 0;

  const lowStock =
    !hasOptions &&
    !outOfStock &&
    product.trackStock &&
    product.stock !== null &&
    product.stock !== undefined &&
    product.stock > 0 &&
    product.stock <= 5
      ? product.stock
      : null;

  function handleAdd() {
    addItem(product);
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

  // Display price = base price (options show adjustments separately)
  const displayPrice = product.price;

  const productHref = `/store/${slug}/products/${product.id}`;

  return (
    <div className="group overflow-hidden rounded-2xl bg-white ring-1 ring-border transition-all duration-200 hover:ring-primary/30 hover:shadow-md">
      {/* Image gallery */}
      <Link href={productHref} className="relative block aspect-[4/3] overflow-hidden bg-muted">
        {images.length > 0 ? (
          <>
            <Image
              src={images[imgIdx]}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIdx((i) => (i - 1 + images.length) % images.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIdx((i) => (i + 1) % images.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, i) => (
                    <button key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIdx(i); }}
                      className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
                    />
                  ))}
                </div>
              </>
            )}
            {/* Badge "options" sur la photo */}
            {hasOptions && (
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur text-[10px] font-bold text-foreground px-2 py-0.5 rounded-full shadow-sm">
                {t("optionCount", { count: product.options.length })}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">📦</div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 space-y-3">
        <Link href={productHref} className="block">
          <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">{product.name}</h3>
          {product.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </Link>

        {/* Stock for simple products */}
        {outOfStock && (
          <p className="text-xs font-bold text-red-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            {t("outOfStock")}
          </p>
        )}
        {lowStock !== null && (
          <p className="text-xs font-semibold text-orange-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
            {t("lowStock", { count: lowStock })}
          </p>
        )}

        {/* Price + action */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            <span className="text-lg font-bold text-primary">
              {hasOptions && <span className="text-xs font-normal text-muted-foreground mr-1">{t("from")}</span>}
              {formatCurrency(displayPrice, currency, locale)}
            </span>
          </div>

          {/* Products WITH options → link to detail page */}
          {hasOptions ? (
            <Link
              href={`/store/${slug}/products/${product.id}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              {t("choose")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            /* Simple product → inline cart controls */
            cartItem && cartKey ? (
              <div className="flex items-center gap-2">
                <button onClick={handleDecrement}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-semibold">{cartItem.quantity}</span>
                <button onClick={handleIncrement}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/80"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button
                onClick={handleAdd}
                size="sm"
                disabled={outOfStock}
                className="h-8 rounded-xl gap-1 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("add")}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
