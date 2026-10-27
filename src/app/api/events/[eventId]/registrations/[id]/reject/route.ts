import { FieldValue } from "firebase-admin/firestore";
import { requireUid, HttpError } from "@/lib/server-auth";
import { loadRegistrationForOrganizer } from "@/lib/event-server";
import { sendRegistrationRejected } from "@/lib/emails/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT : l'organisateur refuse une demande → rejected + email motif.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { eventId, id } = await params;
    const body = await request.json().catch(() => ({}));
    const organizerNote =
      typeof body?.organizerNote === "string" ? body.organizerNote.trim() : undefined;

    const { regRef, registration, event, artisanEmail, artisanName } =
      await loadRegistrationForOrganizer(uid, eventId, id);

    if (["paid", "rejected", "cancelled"].includes(registration.status as string)) {
      throw new HttpError(400, "Demande non refusable dans cet état");
    }

    await regRef.update({
      status: "rejected",
      ...(organizerNote && { organizerNote }),
      rejectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (artisanEmail) {
      await sendRegistrationRejected(artisanEmail, artisanName, event.name, organizerNote);
    }

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[registrations reject]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
