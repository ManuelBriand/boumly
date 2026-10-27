import { adminDb } from "@/lib/firebase-admin";
import { HttpError } from "@/lib/server-auth";
import { validateAndApplyPromo } from "@/lib/checkout-server";
import { currencyForCountry } from "@/lib/countries";

interface ValidatePromoBody {
  slug: string;
  code: string;
  subtotal: number; // sous-total client — aperçu uniquement, revalidé au paiement
}

// Aperçu live d'un code promo au checkout. Le montant définitif est toujours
// recalculé serveur dans createPaymentIntentAndOrder, donc rien n'est falsifiable :
// cette route ne sert qu'à afficher la réduction estimée avant paiement.
export async function POST(request: Request) {
  try {
    const { slug, code, subtotal } = (await request.json()) as ValidatePromoBody;
    if (!slug || !code) throw new HttpError(400, "Requête invalide");

    const storeSnap = await adminDb
      .collection("stores")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (storeSnap.empty) throw new HttpError(404, "Boutique introuvable");

    const storeDoc = storeSnap.docs[0];
    const currency = currencyForCountry(storeDoc.data().country as string | undefined);
    const applied = await validateAndApplyPromo(
      storeDoc.id,
      code,
      Number(subtotal) || 0,
      currency
    );
    return Response.json({ valid: true, ...applied });
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ valid: false, error: err.message }, { status: err.status });
    }
    console.error("[checkout/promo]", err);
    return Response.json({ valid: false, error: "Erreur" }, { status: 500 });
  }
}
