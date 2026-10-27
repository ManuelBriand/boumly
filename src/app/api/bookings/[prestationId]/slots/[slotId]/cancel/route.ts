import { requireUid, HttpError } from "@/lib/server-auth";
import { cancelSlotDoc } from "@/lib/booking-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT : le créateur annule un créneau entier (annule + rembourse toutes les réservations).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ prestationId: string; slotId: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { prestationId, slotId } = await params;
    const result = await cancelSlotDoc(uid, prestationId, slotId);
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[slot cancel]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
