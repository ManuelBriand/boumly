"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CreditCard, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToProducts } from "@/services/product.service";

// Bannière bloquante : affichée UNIQUEMENT quand l'activation Stripe est la
// dernière étape d'onboarding restante (toutes les autres faites, paiements non).
// Tant que d'autres étapes manquent, c'est la checklist d'onboarding qui guide.
export function StripeActivationBanner() {
  const { store } = useAuth();
  const t = useTranslations("dashboard.stripeAlert");
  const [hasProduct, setHasProduct] = useState(false);

  useEffect(() => {
    if (!store) return;
    const unsub = subscribeToProducts(store.id, (p) => setHasProduct(p.length > 0));
    return unsub;
  }, [store]);

  if (!store || store.stripeChargesEnabled) return null;

  // Mêmes critères que la checklist d'onboarding, hors étape paiements.
  const othersDone =
    !!store.photoUrl &&
    !!store.description?.trim() &&
    (!!store.phone?.trim() || !!store.email?.trim()) &&
    store.onboarding?.deliveryReviewed === true &&
    hasProduct;

  if (!othersDone) return null;

  return (
    <div className="m-4 lg:m-6 lg:mb-0">
      <Link
        href="/dashboard/settings?tab=paiements"
        className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100/70"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">{t("title")}</p>
          <p className="text-xs text-amber-800">{t("desc")}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-700">
          <span className="hidden sm:inline">{t("cta")}</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}
