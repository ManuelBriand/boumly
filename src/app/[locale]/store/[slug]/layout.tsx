import { type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { CartProvider } from "@/contexts/CartContext";
import { getStoreBySlug } from "@/services/store.service";
import { currencyForCountry } from "@/lib/countries";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string; locale: string }>;
}

export default async function StoreLayout({ params, children }: Props) {
  const { slug, locale } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    const t = await getTranslations({ locale, namespace: "store" });
    return (
      <div className="flex min-h-screen items-center justify-center text-center">
        <div>
          <p className="text-4xl font-bold text-foreground">404</p>
          <p className="mt-2 text-muted-foreground">{t("notFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <CartProvider
      storeId={store.id}
      currency={currencyForCountry(store.country)}
      locale={locale}
    >
      {children}
    </CartProvider>
  );
}
