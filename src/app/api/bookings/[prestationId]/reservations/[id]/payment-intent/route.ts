import { requireUid, HttpError } from "@/lib/server-auth";
import { createReservationPaymentIntent } from "@/lib/booking-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST : le client crée/relit le PaymentIntent de sa réservation (mode immédiat).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ prestationId: string; id: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { prestationId, id } = await params;
    const result = await createReservationPaymentIntent(uid, prestationId, id);
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[reservation payment-intent]", err);
    return Response.json({ error: "Erreur paiement" }, { status: 500 });
  }
}
