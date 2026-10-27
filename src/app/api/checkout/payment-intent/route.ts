import { HttpError } from "@/lib/server-auth";
import {
  createPaymentIntentAndOrder,
  type CreateIntentInput,
} from "@/lib/checkout-server";

// Crée le PaymentIntent (destination charge + commission) et la commande pending.
// Pas d'auth requise : le client peut commander connecté ou non. Le montant est
// recalculé serveur, donc rien n'est falsifiable depuis le body.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateIntentInput;
    const result = await createPaymentIntentAndOrder(body);
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[checkout/payment-intent]", err);
    return Response.json({ error: "Erreur paiement" }, { status: 500 });
  }
}
