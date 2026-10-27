"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe-client";

function PayForm({
  amountLabel,
  returnUrl,
  onSuccess,
}: {
  amountLabel: string;
  returnUrl: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations("payment");
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    // redirect "if_required" : reste sur la page pour la carte, redirige seulement
    // pour les moyens de paiement qui l'exigent (return_url alors utilisé).
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });
    if (error) {
      toast.error(error.message ?? t("declined"));
      setBusy(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button
        onClick={pay}
        disabled={busy || !stripe}
        className="h-12 w-full rounded-2xl text-base font-semibold"
      >
        {busy ? t("processing") : t("pay", { amount: amountLabel })}
      </Button>
    </div>
  );
}

export function PaymentStep({
  clientSecret,
  connectedAccountId,
  amountLabel,
  returnUrl,
  onSuccess,
}: {
  clientSecret: string;
  // Compte connecté portant la charge (direct charge). Stripe.js doit être chargé
  // sur ce compte pour confirmer le paiement.
  connectedAccountId: string;
  amountLabel: string;
  returnUrl: string;
  onSuccess: () => void;
}) {
  return (
    <Elements
      stripe={getStripe(connectedAccountId)}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <PayForm amountLabel={amountLabel} returnUrl={returnUrl} onSuccess={onSuccess} />
    </Elements>
  );
}
