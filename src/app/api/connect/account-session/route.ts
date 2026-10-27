import { requireUid, HttpError } from "@/lib/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";
import { resolveEventConnectCollection } from "@/lib/connect";

// Crée une AccountSession pour les composants Connect embarqués (solde, virements,
// gestion du compte bancaire). Le client_secret est éphémère et lié au marchand.
// ?target=organizer → compte unifié (boutique si vendeur, sinon users/{uid}).
export async function POST(request: Request) {
  try {
    const uid = await requireUid(request);
    const isOrganizer =
      new URL(request.url).searchParams.get("target") === "organizer";
    const collection = isOrganizer
      ? await resolveEventConnectCollection(uid)
      : "stores";
    const snap = await adminDb.collection(collection).doc(uid).get();
    const accountId = snap.data()?.stripeAccountId as string | undefined;
    if (!accountId) throw new HttpError(400, "Compte Stripe non configuré");

    const session = await stripe.accountSessions.create({
      account: accountId,
      components: {
        // Vue paiements du compte connecté : litiges + remboursements + capture.
        // destination_on_behalf_of désactivé (direct charge, pas destination).
        payments: {
          enabled: true,
          features: {
            refund_management: true,
            dispute_management: true,
            capture_payments: true,
            destination_on_behalf_of_charge_management: false,
          },
        },
        payouts: {
          enabled: true,
          features: {
            edit_payout_schedule: true,
            external_account_collection: true,
            standard_payouts: true,
            instant_payouts: false,
          },
        },
        account_management: {
          enabled: true,
          features: { external_account_collection: true },
        },
        // Solde + virements en attente + rechargement d'un solde négatif.
        balances: {
          enabled: true,
          features: {
            edit_payout_schedule: true,
            external_account_collection: true,
            standard_payouts: true,
            instant_payouts: false,
          },
        },
        // Factures + formulaires fiscaux téléchargeables par le marchand.
        documents: { enabled: true, features: {} },
        notification_banner: { enabled: true },
      },
    });

    return Response.json({ clientSecret: session.client_secret });
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[connect/account-session]", err);
    return Response.json({ error: "Erreur Stripe" }, { status: 500 });
  }
}
