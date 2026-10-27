import { adminDb } from "@/lib/firebase-admin";
import { HttpError } from "@/lib/server-auth";
import {
  finalizeManualOrderPayment,
  type ManualOrderCustomer,
} from "@/lib/manual-order-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET : infos du brouillon (articles + sous-total) pour afficher le lien de paiement.
// L'orderId Firestore aléatoire fait office de capability.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const snap = await adminDb.collection("orders").doc(orderId).get();
    if (!snap.exists) {
      return Response.json({ error: "Commande introuvable" }, { status: 404 });
    }
    const order = snap.data()!;
    return Response.json({
      paid: order.paid === true,
      subtotal: order.subtotal ?? 0,
      storeName: order.storeName ?? null,
      storeSlug: order.storeSlug ?? null,
      note: order.note ?? null,
      items: (order.items ?? []).map(
        (it: { name: string; quantity: number; price: number; variantLabel?: string }) => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          variantLabel: it.variantLabel ?? null,
        })
      ),
    });
  } catch (err) {
    console.error("[orders/:id/pay GET]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}

// POST : le client a choisi sa livraison + coordonnées → crée/maj le PaymentIntent.
// Pas d'auth requise (montant recalculé serveur depuis les articles stockés).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = (await request.json()) as {
      customer: ManualOrderCustomer;
      customerId?: string;
    };
    const result = await finalizeManualOrderPayment({
      orderId,
      customer: body.customer,
      customerId: body.customerId,
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[orders/:id/pay POST]", err);
    return Response.json({ error: "Erreur paiement" }, { status: 500 });
  }
}
