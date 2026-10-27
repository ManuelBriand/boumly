import { requireUid, HttpError } from "@/lib/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import {
  refreshAccountStatus,
  resolveEventConnectCollection,
  type ConnectCollection,
} from "@/lib/connect";

// Relit le statut du compte connecté (charges/payouts) et le persiste.
// ?target=organizer → compte unifié (boutique si vendeur, sinon users/{uid}).
export async function GET(request: Request) {
  try {
    const uid = await requireUid(request);
    const isOrganizer =
      new URL(request.url).searchParams.get("target") === "organizer";
    const collection: ConnectCollection = isOrganizer
      ? await resolveEventConnectCollection(uid)
      : "stores";

    const snap = await adminDb.collection(collection).doc(uid).get();
    const accountId = snap.data()?.stripeAccountId as string | undefined;
    if (!accountId) {
      return Response.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        verificationState: "incomplete",
        requirementsDue: 0,
      });
    }
    const status = await refreshAccountStatus(uid, accountId, collection);
    return Response.json({ connected: true, ...status });
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[connect/status]", err);
    return Response.json({ error: "Erreur Stripe" }, { status: 500 });
  }
}
