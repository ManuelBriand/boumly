import type { User } from "firebase/auth";

async function authedFetch<T>(
  user: User,
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur Stripe");
  return data as T;
}

export type ConnectTarget = "seller" | "organizer";

/** Démarre l'onboarding Stripe — renvoie l'URL hébergée vers laquelle rediriger. */
export function startConnectOnboarding(
  user: User,
  locale?: string,
  target: ConnectTarget = "seller"
): Promise<{ url: string }> {
  return authedFetch(user, "/api/connect/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale, target }),
  });
}

export type StripeVerificationState =
  | "verified"
  | "pending"
  | "action_required"
  | "contact_stripe"
  | "incomplete";

export interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  verificationState: StripeVerificationState;
  requirementsDue: number;
}

/** Relit le statut du compte connecté du vendeur ou de l'organisateur. */
export function fetchConnectStatus(
  user: User,
  target: ConnectTarget = "seller"
): Promise<ConnectStatus> {
  const qs = target === "organizer" ? "?target=organizer" : "";
  return authedFetch(user, `/api/connect/status${qs}`);
}
