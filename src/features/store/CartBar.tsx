"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";

interface CartBarProps {
  onOpen: () => void;
}

export function CartBar({ onOpen }: CartBarProps) {
  const { count, total, currency, locale } = useCart();
  const t = useTranslations("store.cart");

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6">
      <button
        onClick={onOpen}
        className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-2xl bg-primary px-5 py-4 text-white shadow-xl transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary">
              {count > 9 ? "9+" : count}
            </span>
          </div>
          <span className="font-semibold">{t("viewCart")}</span>
        </div>
        <span className="text-lg font-bold">{formatCurrency(total, currency, locale)}</span>
      </button>
    </div>
  );
}
