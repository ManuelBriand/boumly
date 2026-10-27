import { requireUid, HttpError } from "@/lib/server-auth";
import { updateEventDoc } from "@/lib/event-server";
import { EventSchema } from "@/lib/validations/event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT : modifie un événement (propriété vérifiée serveur). Partiel accepté.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { eventId } = await params;

    const parsed = EventSchema.partial().safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Données invalides");
    }

    const result = await updateEventDoc(uid, eventId, parsed.data);
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[events PUT]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
