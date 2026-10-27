import { requireUid, HttpError } from "@/lib/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { createRegistrationDoc } from "@/lib/event-server";
import { sendRegistrationSubmitted, sendNewRegistrationAlert } from "@/lib/emails/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// POST : l'artisan authentifié soumet une demande de place.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { eventId } = await params;
    const body = await request.json().catch(() => ({}));
    const categoryName =
      typeof body?.categoryName === "string" ? body.categoryName : undefined;
    const note = typeof body?.note === "string" ? body.note : undefined;

    const { id, event, artisanName, artisanEmail, storeName } =
      await createRegistrationDoc(uid, eventId, { categoryName, note });

    // Notifications best-effort.
    if (artisanEmail) {
      await sendRegistrationSubmitted(artisanEmail, artisanName, event.name);
    }
    const organizerSnap = await adminDb.collection("users").doc(event.organizerId).get();
    const organizerEmail = organizerSnap.data()?.email as string | undefined;
    if (organizerEmail) {
      const dashboardUrl = `${APP_URL}/fr/dashboard/events/${eventId}/registrations`;
      await sendNewRegistrationAlert(
        organizerEmail,
        event.name,
        artisanName,
        storeName,
        dashboardUrl
      );
    }

    return Response.json({ id });
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[registrations POST]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
