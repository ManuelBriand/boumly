"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { StripeActivationBanner } from "@/features/onboarding/StripeActivationBanner";
import { StoreSetup } from "@/features/onboarding/StoreSetup";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { firebaseUser, store, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Back-office ouvert à tout utilisateur connecté : l'organisation d'événements
  // est une fonctionnalité disponible pour tous (comme la création de boutique),
  // pas un rôle à activer. Seule l'authentification est requise.
  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white">
            B
          </div>
          <Skeleton className="mx-auto h-4 w-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  // Les events sont ouverts à tous (organiser ne requiert pas de boutique). Toute
  // autre zone (home, boutique, produits, ateliers…) nécessite une boutique : un
  // utilisateur sans boutique y voit l'écran de création (CTA), pas un écran blanc.
  // La sidebar reste affichée → il peut toujours aller sur « Marchés ».
  const needsStore = !pathname.startsWith("/dashboard/events");
  const showStoreSetup = !store && needsStore;

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto">
        <MobileHeader />
        {showStoreSetup ? (
          <StoreSetup />
        ) : (
          <>
            <StripeActivationBanner />
            {children}
          </>
        )}
      </main>
    </div>
  );
}
