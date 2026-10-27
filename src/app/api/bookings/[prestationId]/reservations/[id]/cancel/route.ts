import { requireUid, HttpError } from "@/lib/server-auth";
import { cancelReservationDoc } from "@/lib/booking-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT : le créateur annule une réservation (remboursement + promotion liste d'attente).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ prestationId: string; id: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { prestationId, id } = await params;
    const result = await cancelReservationDoc(uid, prestationId, id);
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[reservation cancel]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
