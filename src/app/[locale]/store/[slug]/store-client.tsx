"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { StoreHeader } from "@/features/store/StoreHeader";
import { MarketBadges } from "@/features/store/MarketBadges";
import { StoreProductCard } from "@/features/store/StoreProductCard";
import { StoreAtelierCard } from "@/features/store/StoreAtelierCard";
import { CartBar } from "@/features/store/CartBar";
import { CartDrawer } from "@/features/store/CartDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { subscribeToActiveProducts } from "@/services/product.service";
import type { Store, Product } from "@/types";
// Type-only (les modules *-server sont serveur uniquement → effacés à la compilation).
import type { ExhibitorEventBadge } from "@/lib/event-server";
import type { PrestationCard } from "@/lib/booking-server";
import { Package, Moon, Clock, CalendarClock } from "lucide-react";

interface Props {
  store: Store;
  initialProducts: Product[];
  slug: string;
  exhibitorEvents?: ExhibitorEventBadge[];
  ateliers?: PrestationCard[];
}

export function StoreClient({
  store,
  initialProducts,
  slug,
  exhibitorEvents = [],
  ateliers = [],
}: Props) {
  const t = useTranslations("store");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cartOpen, setCartOpen] = useState(false);

  // Temps réel : on re-souscrit après hydratation, seedé par les produits SSR.
  useEffect(() => {
    const unsub = subscribeToActiveProducts(store.id, setProducts);
    return unsub;
  }, [store.id]);

  // Boutique vendable seulement si Stripe est activé (peut encaisser).
  const sellable = store.stripeChargesEnabled === true;
  const hasAteliers = ateliers.length > 0;

  // Bloc produits (avec ses gardes : fermé / bientôt / vide / grille).
  const productsView = store.temporarilyClosed ? (
    <EmptyState icon={<Moon className="h-8 w-8" />} title={t("closedTitle")} description={t("closedDescription")} />
  ) : !sellable ? (
    <EmptyState icon={<Clock className="h-8 w-8" />} title={t("comingSoonTitle")} description={t("comingSoonDescription")} />
  ) : products.length === 0 ? (
    <EmptyState icon={<Package className="h-8 w-8" />} title={t("noProductsTitle")} description={t("noProductsDescription")} />
  ) : (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-foreground">{t("ourProducts")}</h2>
        <span className="text-sm text-muted-foreground">{t("itemCount", { count: products.length })}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <StoreProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );

  // Bloc ateliers (grille de cartes → page atelier).
  const ateliersView = (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-foreground">{t("ourAteliers")}</h2>
        <span className="text-sm text-muted-foreground">{t("atelierCount", { count: ateliers.length })}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ateliers.map((a) => (
          <StoreAtelierCard key={a.id} atelier={a} />
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <StoreHeader store={store} />

      <MarketBadges events={exhibitorEvents} />

      <main className="mx-auto max-w-2xl px-4 py-6">
        {!hasAteliers ? (
          // Pas d'atelier → vue produits classique (inchangée).
          productsView
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">{t("tabAll")}</TabsTrigger>
              <TabsTrigger value="products">{t("tabProducts")}</TabsTrigger>
              <TabsTrigger value="ateliers">{t("tabAteliers")}</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-8">
              {ateliersView}
              {productsView}
            </TabsContent>
            <TabsContent value="products">{productsView}</TabsContent>
            <TabsContent value="ateliers">
              {ateliers.length === 0 ? (
                <EmptyState icon={<CalendarClock className="h-8 w-8" />} title={t("noAteliersTitle")} description={t("noAteliersDescription")} />
              ) : (
                ateliersView
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {!store.temporarilyClosed && sellable && (
        <>
          <CartBar onOpen={() => setCartOpen(true)} />
          <CartDrawer open={cartOpen} onOpenChange={setCartOpen} slug={slug} />
        </>
      )}
    </div>
  );
}
