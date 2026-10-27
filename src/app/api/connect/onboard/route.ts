import { requireUid, HttpError } from "@/lib/server-auth";
import {
  ensureConnectedAccount,
  createOnboardingLink,
  resolveEventConnectCollection,
  type ConnectCollection,
} from "@/lib/connect";

// Crée le compte connecté si besoin puis renvoie l'URL d'onboarding Stripe.
// target="organizer" → compte unifié (boutique si vendeur, sinon users/{uid}),
// retour vers /dashboard/events.
export async function POST(request: Request) {
  try {
    const uid = await requireUid(request);
    const body = await request.json().catch(() => ({}));
    const locale = typeof body?.locale === "string" ? body.locale : undefined;
    const isOrganizer = body?.target === "organizer";
    const collection: ConnectCollection = isOrganizer
      ? await resolveEventConnectCollection(uid)
      : "stores";
    const returnPath = isOrganizer ? "/dashboard/events" : "/dashboard/settings";

    const accountId = await ensureConnectedAccount(uid, { locale, collection });
    const url = await createOnboardingLink(accountId, { locale, returnPath });
    return Response.json({ url });
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[connect/onboard]", err);
    return Response.json({ error: "Erreur Stripe" }, { status: 500 });
  }
}
