"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductForm } from "@/features/products/ProductForm";
import { ProductSkeleton } from "@/features/products/ProductSkeleton";
import { getProductById } from "@/services/product.service";
import type { Product } from "@/types";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { firebaseUser } = useAuth();
  const t = useTranslations("productPages");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProductById(id).then((p) => {
      if (!p) setNotFound(true);
      else setProduct(p);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6 lg:p-8">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-muted" />
        <ProductSkeleton />
        <ProductSkeleton />
      </div>
    );
  }

  if (notFound || !product || !firebaseUser) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6 lg:p-8">
      <PageHeader
        title={t("editTitle")}
        description={product.name}
      />
      <div className="mt-6">
        <ProductForm
          product={product}
          creatorId={firebaseUser.uid}
        />
      </div>
    </div>
  );
}
