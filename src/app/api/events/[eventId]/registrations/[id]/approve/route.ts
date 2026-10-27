import { FieldValue } from "firebase-admin/firestore";
import { requireUid, HttpError } from "@/lib/server-auth";
import { loadRegistrationForOrganizer } from "@/lib/event-server";
import { fromMinorUnits } from "@/lib/countries";
import { formatCurrency } from "@/lib/utils";
import { sendRegistrationApproved } from "@/lib/emails/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// PUT : l'organisateur approuve une demande → payment_pending + email lien paiement.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const uid = await requireUid(request);
    const { eventId, id } = await params;

    const { regRef, registration, event, artisanEmail, artisanName } =
      await loadRegistrationForOrganizer(uid, eventId, id);

    if (!["pending", "approved"].includes(registration.status as string)) {
      throw new HttpError(400, "Demande non approuvable dans cet état");
    }

    await regRef.update({
      status: "payment_pending",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Email artisan avec lien de paiement (la page register détecte ?reg= et paie).
    const currency = (registration.currency as string) ?? event.currency ?? "eur";
    const amountLabel = formatCurrency(
      fromMinorUnits(registration.amount as number, currency),
      currency
    );
    const payUrl = `${APP_URL}/fr/event/${event.slug}/register?reg=${id}`;
    if (artisanEmail) {
      await sendRegistrationApproved(artisanEmail, artisanName, event.name, amountLabel, payUrl);
    }

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[registrations approve]", err);
    return Response.json({ error: "Erreur" }, { status: 500 });
  }
}
