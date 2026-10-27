"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductCard } from "@/features/products/ProductCard";
import { ProductSkeleton } from "@/features/products/ProductSkeleton";
import { Button } from "@/components/ui/button";
import { subscribeToProducts } from "@/services/product.service";
import type { Product } from "@/types";

export default function ProductsPage() {
  const { store } = useAuth();
  const t = useTranslations("dashboard.products");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store) return;
    const unsub = subscribeToProducts(store.id, (p) => {
      setProducts(p);
      setLoading(false);
    });
    return unsub;
  }, [store]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Link href="/dashboard/products/new">
            <Button className="h-9 rounded-xl gap-1.5 font-semibold">
              <Plus className="h-4 w-4" />
              {t("add")}
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/dashboard/products/new">
              <Button className="rounded-xl gap-1.5 font-semibold">
                <Plus className="h-4 w-4" />
                {t("add")}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
