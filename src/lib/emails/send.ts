// Couche d'envoi des emails transactionnels. Best-effort : log + jamais de throw.
import { sendMail } from "@/lib/mailjet";
import {
  orderConfirmation,
  newOrderAlert,
  manualPayLink,
  registrationSubmitted,
  newRegistrationAlert,
  registrationApproved,
  registrationPaid,
  registrationPaymentReceived,
  registrationRejected,
  bookingConfirmed,
  bookingCancelled,
  bookingFullRefunded,
  waitlistPromoted,
  waitlistPayToConfirm,
  type EmailOrder,
  type EmailStore,
} from "@/lib/emails/templates";
import type { Order } from "@/types";

type RawOrder = Record<string, unknown>;

// Normalise une donnée Firestore brute (Admin SDK) en EmailOrder.
function toEmailOrder(id: string, d: RawOrder): EmailOrder {
  return {
    id,
    customerName: (d.customerName as string) ?? "",
    customerEmail: d.customerEmail as string | undefined,
    items: (d.items as Order["items"]) ?? [],
    subtotal: (d.subtotal as number) ?? 0,
    total: (d.total as number) ?? 0,
    fulfillmentMethod: (d.fulfillmentMethod as Order["fulfillmentMethod"]) ?? "pickup",
    fulfillmentFee: (d.fulfillmentFee as number) ?? 0,
    address: d.address as string | undefined,
    zipCode: d.zipCode as string | undefined,
    city: d.city as string | undefined,
    requestedDate: d.requestedDate as string | undefined,
    requestedTime: d.requestedTime as string | undefined,
    note: d.note as string | undefined,
    storeName: d.storeName as string | undefined,
  };
}

// Confirmation → client
export async function sendOrderConfirmation(
  orderId: string,
  data: RawOrder,
  store: EmailStore
): Promise<void> {
  try {
    const email = data.customerEmail as string | undefined;
    if (!email) return;
    const order = toEmailOrder(orderId, data);
    const { subject, html } = orderConfirmation(order, store);
    await sendMail({
      to: email,
      toName: order.customerName,
      subject,
      html,
      replyTo: store.email,
    });
  } catch (err) {
    console.error("[email] sendOrderConfirmation", err);
  }
}

// Nouvelle commande → vendeur
export async function sendNewOrderAlert(
  orderId: string,
  data: RawOrder,
  store: EmailStore,
  sellerEmail?: string
): Promise<void> {
  try {
    if (!sellerEmail) return;
    const order = toEmailOrder(orderId, data);
    const { subject, html } = newOrderAlert(order, store);
    await sendMail({
      to: sellerEmail,
      subject,
      html,
      replyTo: order.customerEmail,
    });
  } catch (err) {
    console.error("[email] sendNewOrderAlert", err);
  }
}

// Lien de paiement → client (commande manuelle en ligne)
export async function sendManualPayLink(
  orderId: string,
  data: RawOrder,
  store: EmailStore,
  payUrl: string
): Promise<{ ok: boolean }> {
  try {
    const email = data.customerEmail as string | undefined;
    if (!email) return { ok: false };
    const order = toEmailOrder(orderId, data);
    const { subject, html } = manualPayLink(order, store, payUrl);
    return await sendMail({
      to: email,
      toName: order.customerName,
      subject,
      html,
      replyTo: store.email,
    });
  } catch (err) {
    console.error("[email] sendManualPayLink", err);
    return { ok: false };
  }
}

// ─── Marchés ────────────────────────────────────────────────────────
// Best-effort : log + jamais de throw (comme les emails de commande).

export async function sendRegistrationSubmitted(
  to: string,
  artisanName: string,
  eventName: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = registrationSubmitted(artisanName, eventName);
    await sendMail({ to, toName: artisanName, subject, html });
  } catch (err) {
    console.error("[email] sendRegistrationSubmitted", err);
  }
}

export async function sendNewRegistrationAlert(
  to: string,
  eventName: string,
  artisanName: string,
  storeName: string,
  dashboardUrl: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = newRegistrationAlert(
      eventName,
      artisanName,
      storeName,
      dashboardUrl
    );
    await sendMail({ to, subject, html });
  } catch (err) {
    console.error("[email] sendNewRegistrationAlert", err);
  }
}

export async function sendRegistrationApproved(
  to: string,
  artisanName: string,
  eventName: string,
  amountLabel: string,
  payUrl: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = registrationApproved(
      artisanName,
      eventName,
      amountLabel,
      payUrl
    );
    await sendMail({ to, toName: artisanName, subject, html });
  } catch (err) {
    console.error("[email] sendRegistrationApproved", err);
  }
}

export async function sendRegistrationPaid(
  to: string,
  artisanName: string,
  eventName: string,
  practicalInfo: string,
  storeUrl: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = registrationPaid(artisanName, eventName, practicalInfo, storeUrl);
    await sendMail({ to, toName: artisanName, subject, html });
  } catch (err) {
    console.error("[email] sendRegistrationPaid", err);
  }
}

export async function sendRegistrationPaymentReceived(
  to: string,
  eventName: string,
  artisanName: string,
  storeName: string,
  amountLabel: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = registrationPaymentReceived(
      eventName,
      artisanName,
      storeName,
      amountLabel
    );
    await sendMail({ to, subject, html });
  } catch (err) {
    console.error("[email] sendRegistrationPaymentReceived", err);
  }
}

export async function sendRegistrationRejected(
  to: string,
  artisanName: string,
  eventName: string,
  organizerNote?: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = registrationRejected(artisanName, eventName, organizerNote);
    await sendMail({ to, toName: artisanName, subject, html });
  } catch (err) {
    console.error("[email] sendRegistrationRejected", err);
  }
}

// ─── Ateliers (prestations sur créneaux) — client ───────────────────

export async function sendBookingConfirmed(
  to: string,
  clientNom: string,
  label: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = bookingConfirmed(clientNom, label);
    await sendMail({ to, toName: clientNom, subject, html });
  } catch (err) {
    console.error("[email] sendBookingConfirmed", err);
  }
}

export async function sendBookingCancelled(
  to: string,
  clientNom: string,
  label: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = bookingCancelled(clientNom, label);
    await sendMail({ to, toName: clientNom, subject, html });
  } catch (err) {
    console.error("[email] sendBookingCancelled", err);
  }
}

export async function sendBookingFullRefunded(
  to: string,
  clientNom: string,
  label: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = bookingFullRefunded(clientNom, label);
    await sendMail({ to, toName: clientNom, subject, html });
  } catch (err) {
    console.error("[email] sendBookingFullRefunded", err);
  }
}

export async function sendWaitlistPromoted(
  to: string,
  clientNom: string,
  label: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = waitlistPromoted(clientNom, label);
    await sendMail({ to, toName: clientNom, subject, html });
  } catch (err) {
    console.error("[email] sendWaitlistPromoted", err);
  }
}

export async function sendWaitlistPayToConfirm(
  to: string,
  clientNom: string,
  label: string,
  payUrl: string
): Promise<void> {
  try {
    if (!to) return;
    const { subject, html } = waitlistPayToConfirm(clientNom, label, payUrl);
    await sendMail({ to, toName: clientNom, subject, html });
  } catch (err) {
    console.error("[email] sendWaitlistPayToConfirm", err);
  }
}
