import { requireUid, HttpError } from "@/lib/server-auth";
import { createPrestationDoc } from "@/lib/booking-server";
import { PrestationSchema } from "@/lib/validations/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST : crée un atelier (prestation) pour la boutique de l'utilisateur authentifié.
export async function POST(request: Request) {
  try {
    const uid = await requireUid(request);

    const parsed = PrestationSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Données invalides");
    }

    const result = await createPrestationDoc(uid, parsed.data);
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[bookings POST]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
