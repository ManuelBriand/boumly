import type { Metadata } from "next";
import type { ReactNode } from "react";

// Back-office vendeur — privé, exclu de l'indexation.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardSegmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
