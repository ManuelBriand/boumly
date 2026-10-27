"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/useCart";
import { getCartItemKey, getItemPrice } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/utils";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
}

export function CartDrawer({ open, onOpenChange, slug }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, total, count, currency, locale } = useCart();
  const t = useTranslations("store.cart");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[85dvh] flex-col rounded-t-2xl p-0"
        showCloseButton={false}
      >
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-5 w-5 text-primary" />
            {t("title")}
            {count > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {count}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-foreground">{t("empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("emptyHint")}
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                {items.map((item) => {
                  const key = getCartItemKey(item);
                  const price = getItemPrice(item);
                  const imgSrc = item.product.images?.[0] ?? item.product.imageUrl;
                  const variantLabel = item.selectedOptions
                    ? Object.values(item.selectedOptions).join(" — ")
                    : undefined;

                  return (
                    <div key={key} className="flex items-start gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {imgSrc ? (
                          <Image src={imgSrc} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xl">📦</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.product.name}
                        </p>
                        {variantLabel && (
                          <p className="text-xs text-muted-foreground">{variantLabel}</p>
                        )}
                        {item.customFieldValue && (
                          <p className="text-xs text-muted-foreground italic">&quot;{item.customFieldValue}&quot;</p>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(price * item.quantity, currency, locale)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() =>
                            item.quantity === 1
                              ? removeItem(key)
                              : updateQuantity(key, item.quantity - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                        </button>
                        <span className="w-4 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(key, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/80"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 border-t border-border px-5 pb-8 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("total")}</span>
                <span className="text-xl font-bold text-foreground">
                  {formatCurrency(total, currency, locale)}
                </span>
              </div>
              <Separator className="mb-4" />
              <Link href={`/store/${slug}/checkout`} onClick={() => onOpenChange(false)}>
                <Button className="h-12 w-full rounded-2xl text-base font-semibold">
                  {t("checkout")} — {formatCurrency(total, currency, locale)}
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
