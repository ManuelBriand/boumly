import { requireUid, HttpError } from "@/lib/server-auth";
import { updatePrestationDoc } from "@/lib/booking-server";
import { PrestationSchema } from "@/lib/validations/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT : met à jour un atelier (propriétaire uniquement).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ prestationId: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { prestationId } = await params;

    // Union discriminée (recurrent | ponctuel) → payload complet requis à l'édition.
    const parsed = PrestationSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Données invalides");
    }

    const result = await updatePrestationDoc(uid, prestationId, parsed.data);
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[bookings PUT]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
