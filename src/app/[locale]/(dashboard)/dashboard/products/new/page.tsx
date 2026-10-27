"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductForm } from "@/features/products/ProductForm";

export default function NewProductPage() {
  const { firebaseUser } = useAuth();
  const t = useTranslations("productPages");

  if (!firebaseUser) return null;

  return (
    <div className="mx-auto max-w-xl p-6 lg:p-8">
      <PageHeader
        title={t("newTitle")}
        description={t("newSubtitle")}
      />
      <div className="mt-6">
        <ProductForm creatorId={firebaseUser.uid} />
      </div>
    </div>
  );
}
