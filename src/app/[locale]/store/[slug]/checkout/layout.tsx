import type { Metadata } from "next";
import type { ReactNode } from "react";

// Tunnel de paiement — exclu de l'indexation.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children;
}
