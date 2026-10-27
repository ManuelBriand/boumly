import type { Metadata } from "next";
import type { ReactNode } from "react";

// Page de paiement d'une commande — exclue de l'indexation.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PayLayout({ children }: { children: ReactNode }) {
  return children;
}
