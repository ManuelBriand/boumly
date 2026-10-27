"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/services/product.service";
import { formatCurrency } from "@/lib/utils";
import { currencyForCountry } from "@/lib/countries";
import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@/types";
import { useState } from "react";

// ─── Stock badge ──────────────────────────────────────────────────
function StockBadge({ product }: { product: Product }) {
  const t = useTranslations("productCard");
  if (!product.trackStock && !product.variants?.some((v) => v.stock !== null)) return null;

  let stock: number | null = null;

  if (product.variants?.length > 0) {
    // Min stock among enabled variants that have a stock set
    const tracked = product.variants
      .filter((v) => v.enabled && v.stock !== null)
      .map((v) => v.stock as number);
    if (tracked.length === 0) return null;
    stock = Math.min(...tracked);
  } else if (product.trackStock) {
    stock = product.stock ?? null;
    if (stock === null) return null;
  } else {
    return null;
  }

  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {t("outOfStock")}
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        {t("remaining", { count: stock })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      {t("inStock", { count: stock })}
    </span>
  );
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { store } = useAuth();
  const currency = currencyForCountry(store?.country);
  const locale = useLocale();
  const t = useTranslations("productCard");
  const tc = useTranslations("common");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      toast.success(t("deleted"));
      setDeleteOpen(false);
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-border transition-shadow hover:shadow-sm">
        {/* Image */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">📦</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{product.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-sm font-medium text-primary">
              {product.options?.length > 0
                ? t("fromPrice", { price: formatCurrency(product.price, currency, locale) })
                : formatCurrency(product.price, currency, locale)}
            </p>
            {product.variants?.length > 0 && (
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {t("variantCount", { count: product.variants.length })}
              </span>
            )}
            <StockBadge product={product} />
          </div>
        </div>

        {/* Badge */}
        <Badge variant={product.active ? "default" : "outline"} className="shrink-0">
          {product.active ? t("active") : t("inactive")}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteOpen(true)}
            className="text-destructive hover:text-destructive hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("deleteConfirmBody", { name: product.name })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? t("deleting") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
