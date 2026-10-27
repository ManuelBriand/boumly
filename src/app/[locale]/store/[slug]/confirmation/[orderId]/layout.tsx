import type { Metadata } from "next";
import type { ReactNode } from "react";

// Confirmation de commande — exclue de l'indexation.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ConfirmationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
