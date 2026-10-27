import { requireUid, HttpError } from "@/lib/server-auth";
import { createRegistrationPaymentIntent } from "@/lib/event-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST : l'artisan crée/relit le PaymentIntent de sa place (après approbation).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { eventId, id } = await params;
    const result = await createRegistrationPaymentIntent(uid, eventId, id);
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[registration payment-intent]", err);
    return Response.json({ error: "Erreur paiement" }, { status: 500 });
  }
}
