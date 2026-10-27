import { requireUid, HttpError } from "@/lib/server-auth";
import { createEventDoc } from "@/lib/event-server";
import { EventSchema } from "@/lib/validations/event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST : crée un événement pour l'utilisateur authentifié.
// Ouvert à tout compte connecté — pas de rôle « organisateur » à activer.
export async function POST(request: Request) {
  try {
    const uid = await requireUid(request);

    const parsed = EventSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Données invalides");
    }

    const result = await createEventDoc(uid, parsed.data);
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[events POST]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
