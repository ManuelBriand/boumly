"use client";

import { useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js/pure";
import {
  ConnectComponentsProvider,
  ConnectNotificationBanner,
  ConnectPayments,
  ConnectPayouts,
  ConnectAccountManagement,
  ConnectDocuments,
} from "@stripe/react-connect-js";
import type { User } from "firebase/auth";

/**
 * Composants Connect embarqués : solde, virements à venir, historique,
 * et gestion du compte bancaire (IBAN) / calendrier de virement — le tout in-app.
 */
export function StripePayoutsPanel({
  firebaseUser,
  target = "seller",
}: {
  firebaseUser: User;
  target?: "seller" | "organizer";
}) {
  // Instance créée une seule fois côté client. fetchClientSecret est rappelé
  // par Stripe pour rafraîchir la session.
  const [connectInstance] = useState(() =>
    loadConnectAndInitialize({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      fetchClientSecret: async () => {
        const token = await firebaseUser.getIdToken();
        const qs = target === "organizer" ? "?target=organizer" : "";
        const res = await fetch(`/api/connect/account-session${qs}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur Stripe");
        return data.clientSecret as string;
      },
      // L'iframe Connect n'hérite pas de next/font — on recharge Geist et on
      // aligne couleur/rayon sur le thème de l'app.
      fonts: [
        {
          cssSrc:
            "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap",
        },
      ],
      appearance: {
        variables: {
          fontFamily: "Geist, sans-serif",
          colorPrimary: "#FF4D6D",
          borderRadius: "12px",
        },
      },
    })
  );

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <div className="space-y-4">
        <ConnectNotificationBanner />
        <ConnectPayments />
        <ConnectPayouts />
        <ConnectAccountManagement />
        <ConnectDocuments />
      </div>
    </ConnectComponentsProvider>
  );
}
