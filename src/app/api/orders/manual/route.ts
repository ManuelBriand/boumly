import { requireUid, HttpError } from "@/lib/server-auth";
import {
  createManualOrder,
  type ManualOrderItem,
  type ManualOrderCustomer,
  type ManualPayment,
} from "@/lib/manual-order-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Crée une commande manuelle (vendeur authentifié). Mode online → brouillon + lien ;
// cash/none → commande finalisée sans Stripe.
export async function POST(request: Request) {
  try {
    const uid = await requireUid(request);
    const body = (await request.json()) as {
      items: ManualOrderItem[];
      note?: string;
      payment: ManualPayment;
      customer?: ManualOrderCustomer;
      customerEmail?: string;
      locale?: string;
    };
    const result = await createManualOrder({
      uid,
      items: body.items,
      note: body.note,
      payment: body.payment,
      customer: body.customer,
      customerEmail: body.customerEmail,
      locale: body.locale,
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[orders/manual]", err);
    return Response.json({ error: "Erreur création commande" }, { status: 500 });
  }
}
