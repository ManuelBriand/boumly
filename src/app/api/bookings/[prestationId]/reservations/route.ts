import { requireUid, HttpError } from "@/lib/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { createReservationDoc } from "@/lib/booking-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST : le client authentifié réserve un créneau (slotId dans le body).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ prestationId: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { prestationId } = await params;
    const body = await request.json().catch(() => ({}));
    const slotId = typeof body?.slotId === "string" ? body.slotId : undefined;
    if (!slotId) throw new HttpError(400, "Créneau manquant");

    // Identité du client (compte obligatoire) pour les notifications.
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const user = userSnap.data() ?? {};
    const email = (user.email as string | undefined) ?? "";
    const nom = (user.name as string) ?? (user.storeName as string) ?? "Client";

    const result = await createReservationDoc(uid, prestationId, slotId, { email, nom });
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[reservations POST]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
