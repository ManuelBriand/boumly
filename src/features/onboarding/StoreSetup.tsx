"use client";

import { useTranslations } from "next-intl";
import { CreateStoreForm } from "@/features/onboarding/CreateStoreForm";

// Écran de nommage : un utilisateur sans boutique (inscription Google, ou qui
// accède à une zone vendeur du dashboard) crée sa boutique ici. La création
// passe par CreateStoreForm (partagé avec l'onboarding inline des marchés).
export function StoreSetup() {
  const t = useTranslations("dashboard.setupStore");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-white p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("desc")}</p>
        </div>
        <CreateStoreForm />
      </div>
    </div>
  );
}
