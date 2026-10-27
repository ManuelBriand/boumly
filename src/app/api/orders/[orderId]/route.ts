import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET : commande pour la page de confirmation.
// L'orderId Firestore aléatoire fait office de capability (lien partagé au client).
// On ne renvoie qu'un sous-ensemble public : pas de financier vendeur
// (applicationFee, netAmount, paymentIntentId) ni de contact client redondant.
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
    const o = snap.data()!;

    // Brouillon manuel non finalisé → invisible. Une commande storefront payée
    // reste paid:false quelques secondes (le webhook flip paid en différé), donc
    // on se base sur le statut "draft" et non sur paid pour éviter un faux 404.
    if (o.status === "draft") {
      return Response.json({ error: "Commande introuvable" }, { status: 404 });
    }

    return Response.json({
      id: snap.id,
      customerName: o.customerName ?? "",
      items: o.items ?? [],
      subtotal: o.subtotal ?? 0,
      total: o.total ?? 0,
      status: o.status ?? "new",
      paid: o.paid === true,
      payment: o.payment ?? null,
      fulfillmentMethod: o.fulfillmentMethod,
      fulfillmentFee: o.fulfillmentFee ?? 0,
      address: o.address ?? null,
      zipCode: o.zipCode ?? null,
      city: o.city ?? null,
      requestedDate: o.requestedDate ?? null,
      requestedTime: o.requestedTime ?? null,
      note: o.note ?? null,
      storeName: o.storeName ?? null,
      storeSlug: o.storeSlug ?? null,
    });
  } catch (err) {
    console.error("[orders/:id GET]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
