// Templates HTML des emails transactionnels. Fonctions pures → { subject, html }.
import type { Order } from "@/types";
import { FULFILLMENT_LABELS } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { formatRequestedDate } from "@/lib/scheduling";

// Sous-ensemble des champs d'une commande nécessaires aux emails (évite la
// dépendance au Timestamp Firestore côté serveur).
export type EmailOrder = Pick<
  Order,
  | "id"
  | "customerName"
  | "items"
  | "subtotal"
  | "total"
  | "currency"
  | "fulfillmentMethod"
  | "fulfillmentFee"
  | "address"
  | "zipCode"
  | "city"
  | "requestedDate"
  | "requestedTime"
  | "note"
  | "storeName"
> & { customerEmail?: string };

export interface EmailStore {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

// Couleurs du thème Boumly (cf. globals.css : --primary / --primary-light).
const BRAND = "#FF4D6D";
const BRAND_LIGHT = "#FFF1F4";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function orderRef(order: EmailOrder): string {
  return `#${order.id.slice(-8).toUpperCase()}`;
}

// Bloc récap articles + total, partagé par confirmation (client) et alerte (vendeur).
function itemsBlock(order: EmailOrder): string {
  const rows = (order.items ?? [])
    .map(
      (it) => `
      <tr>
        <td style="padding:6px 0;color:#111;font-size:14px;">
          ${it.quantity}× ${esc(it.name)}${it.variantLabel ? ` <span style="color:#777;">(${esc(it.variantLabel)})</span>` : ""}
          ${it.customFieldValue ? `<br><span style="color:#777;font-size:12px;">${esc(it.customFieldValue)}</span>` : ""}
        </td>
        <td style="padding:6px 0;text-align:right;color:#111;font-size:14px;white-space:nowrap;">
          ${formatCurrency(it.price * it.quantity, order.currency)}
        </td>
      </tr>`
    )
    .join("");

  const feeRow =
    order.fulfillmentFee > 0
      ? `<tr>
           <td style="padding:6px 0;color:#777;font-size:14px;">${FULFILLMENT_LABELS[order.fulfillmentMethod]}</td>
           <td style="padding:6px 0;text-align:right;color:#777;font-size:14px;">${formatCurrency(order.fulfillmentFee, order.currency)}</td>
         </tr>`
      : "";

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows}
      ${feeRow}
      <tr><td colspan="2" style="border-top:1px solid #eee;padding-top:10px;"></td></tr>
      <tr>
        <td style="color:#111;font-size:16px;font-weight:700;">Total</td>
        <td style="text-align:right;color:${BRAND};font-size:16px;font-weight:700;">${formatCurrency(order.total, order.currency)}</td>
      </tr>
    </table>`;
}

// Bloc mode de réception + adresse/date.
function fulfillmentBlock(order: EmailOrder, store: EmailStore): string {
  const lines: string[] = [`<strong>${FULFILLMENT_LABELS[order.fulfillmentMethod]}</strong>`];
  const isPickup = order.fulfillmentMethod === "pickup";

  if (isPickup && store.address) {
    lines.push(`Point de retrait : ${esc(store.address)}`);
  }
  if (!isPickup) {
    const addr = [order.address, [order.zipCode, order.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    if (addr) lines.push(esc(addr));
  }
  if (order.requestedDate) {
    lines.push(
      `${formatRequestedDate(order.requestedDate)}${order.requestedTime ? ` · ${esc(order.requestedTime)}` : ""}`
    );
  }

  return `<div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND};border-radius:12px;padding:14px 16px;font-size:14px;color:#444;line-height:1.6;">
    ${lines.join("<br>")}
  </div>`;
}

function layout(title: string, storeName: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 0;">
      <tr><td align="center">
        <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;">
          <tr><td style="background:${BRAND};padding:18px 24px;">
            <span style="color:#fff;font-size:18px;font-weight:700;">${esc(storeName)}</span>
          </td></tr>
          <tr><td style="padding:24px;">
            <h1 style="margin:0 0 16px;font-size:20px;color:#111;">${esc(title)}</h1>
            ${inner}
          </td></tr>
          <tr><td style="padding:16px 24px;border-top:1px solid #eee;">
            <span style="color:#999;font-size:12px;">Envoyé via Boumly</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

// ─── 1. Confirmation commande → client ──────────────────────────────
export function orderConfirmation(
  order: EmailOrder,
  store: EmailStore
): { subject: string; html: string } {
  const storeName = order.storeName ?? store.name ?? "Boutique";
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Merci ${esc(order.customerName ?? "")} ! Votre commande <strong>${orderRef(order)}</strong> a bien été reçue.
    </p>
    ${fulfillmentBlock(order, store)}
    ${order.note ? `<p style="margin:16px 0 0;font-size:13px;color:#777;"><strong>Votre note :</strong> ${esc(order.note)}</p>` : ""}
    <div style="margin:20px 0;border-top:1px solid #eee;"></div>
    ${itemsBlock(order)}
    ${store.phone ? `<p style="margin:20px 0 0;font-size:13px;color:#777;">Une question ? Contactez la boutique au ${esc(store.phone)}.</p>` : ""}
  `;
  return {
    subject: `Commande confirmée ${orderRef(order)} — ${storeName}`,
    html: layout("Commande confirmée 🎉", storeName, inner),
  };
}

// ─── 2. Nouvelle commande → vendeur ─────────────────────────────────
export function newOrderAlert(
  order: EmailOrder,
  store: EmailStore
): { subject: string; html: string } {
  const storeName = order.storeName ?? store.name ?? "Boutique";
  const contact = [order.customerName, order.customerEmail]
    .filter((x): x is string => Boolean(x))
    .map(esc)
    .join(" · ");
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Nouvelle commande <strong>${orderRef(order)}</strong>${contact ? ` de ${contact}` : ""}.
    </p>
    ${fulfillmentBlock(order, store)}
    ${order.note ? `<p style="margin:16px 0 0;font-size:13px;color:#777;"><strong>Note client :</strong> ${esc(order.note)}</p>` : ""}
    <div style="margin:20px 0;border-top:1px solid #eee;"></div>
    ${itemsBlock(order)}
  `;
  return {
    subject: `Nouvelle commande ${orderRef(order)} — ${formatCurrency(order.total, order.currency)}`,
    html: layout("Nouvelle commande 🛍️", storeName, inner),
  };
}

// ─── 3. Lien de paiement → client (commande manuelle en ligne) ──────
export function manualPayLink(
  order: EmailOrder,
  store: EmailStore,
  payUrl: string
): { subject: string; html: string } {
  const storeName = order.storeName ?? store.name ?? "Boutique";
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      ${esc(storeName)} a préparé une commande pour vous. Choisissez votre mode de réception et réglez en ligne :
    </p>
    <div style="margin:20px 0;border-top:1px solid #eee;"></div>
    ${itemsBlock({ ...order, fulfillmentFee: 0, total: order.subtotal })}
    <p style="margin:8px 0 20px;font-size:12px;color:#999;">Les frais de livraison éventuels seront ajoutés à l'étape suivante.</p>
    <a href="${esc(payUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:12px;">
      Payer ma commande
    </a>
    <p style="margin:20px 0 0;font-size:12px;color:#999;word-break:break-all;">Ou copiez ce lien : ${esc(payUrl)}</p>
  `;
  return {
    subject: `Votre lien de paiement — ${storeName}`,
    html: layout("Finalisez votre commande", storeName, inner),
  };
}

// ─── Marchés (organisateur ↔ artisan) ───────────────────────────────

function ctaButton(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:12px;">${esc(label)}</a>`;
}

// 1. Artisan — demande soumise (en attente d'examen)
export function registrationSubmitted(
  artisanName: string,
  eventName: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Bonjour ${esc(artisanName)}, votre demande de place au marché <strong>${esc(eventName)}</strong> a bien été reçue.
    </p>
    <p style="margin:0;font-size:14px;color:#444;">
      L'organisateur va l'examiner. Vous recevrez un email dès qu'elle sera traitée.
    </p>`;
  return {
    subject: `Demande envoyée — ${eventName}`,
    html: layout("Demande en cours d'examen ⏳", eventName, inner),
  };
}

// 2. Organisateur — nouvelle demande reçue
export function newRegistrationAlert(
  eventName: string,
  artisanName: string,
  storeName: string,
  dashboardUrl: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Nouvelle demande de <strong>${esc(artisanName)}</strong> (${esc(storeName)}) pour le marché <strong>${esc(eventName)}</strong>.
    </p>
    ${ctaButton(dashboardUrl, "Voir la demande")}`;
  return {
    subject: `Nouvelle demande — ${eventName}`,
    html: layout("Nouvelle demande de place 📩", eventName, inner),
  };
}

// 3. Artisan — demande approuvée + lien de paiement
export function registrationApproved(
  artisanName: string,
  eventName: string,
  amountLabel: string,
  payUrl: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Bonne nouvelle ${esc(artisanName)} ! Votre demande pour <strong>${esc(eventName)}</strong> est acceptée.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Pour confirmer votre place, réglez les frais de stand de <strong>${esc(amountLabel)}</strong> :
    </p>
    ${ctaButton(payUrl, "Payer ma place")}
    <p style="margin:20px 0 0;font-size:12px;color:#999;word-break:break-all;">Ou copiez ce lien : ${esc(payUrl)}</p>`;
  return {
    subject: `Demande acceptée — ${eventName}`,
    html: layout("Votre place est réservée 🎉", eventName, inner),
  };
}

// 4. Artisan — paiement confirmé + infos pratiques
export function registrationPaid(
  artisanName: string,
  eventName: string,
  practicalInfo: string,
  storeUrl: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Merci ${esc(artisanName)} ! Votre place au marché <strong>${esc(eventName)}</strong> est confirmée et payée.
    </p>
    ${practicalInfo ? `<div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND};border-radius:12px;padding:14px 16px;font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">${esc(practicalInfo)}</div>` : ""}
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Dernière étape : complétez votre boutique (photo, description, produits) pour que les visiteurs de <strong>${esc(eventName)}</strong> vous trouvent et commandent chez vous.
    </p>
    ${ctaButton(storeUrl, "Compléter ma boutique")}`;
  return {
    subject: `Paiement confirmé — ${eventName}`,
    html: layout("Place confirmée ✅", eventName, inner),
  };
}

// 5. Organisateur — paiement reçu
export function registrationPaymentReceived(
  eventName: string,
  artisanName: string,
  storeName: string,
  amountLabel: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      <strong>${esc(artisanName)}</strong> (${esc(storeName)}) a réglé sa place au marché <strong>${esc(eventName)}</strong>.
    </p>
    <p style="margin:0;font-size:16px;color:${BRAND};font-weight:700;">${esc(amountLabel)}</p>`;
  return {
    subject: `Paiement reçu — ${eventName}`,
    html: layout("Paiement reçu 💰", eventName, inner),
  };
}

// ─── Ateliers (prestations sur créneaux) — client ───────────────────
// Wording visible « Atelier » (jamais « prestation »). `label` = "Nom — date".

// A. Réservation confirmée (sur place OU paiement en ligne reçu)
export function bookingConfirmed(
  clientNom: string,
  label: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Merci ${esc(clientNom)} ! Votre réservation est confirmée :
    </p>
    <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND};border-radius:12px;padding:14px 16px;font-size:14px;color:#444;line-height:1.6;">
      <strong>${esc(label)}</strong>
    </div>`;
  return {
    subject: `Réservation confirmée — ${label}`,
    html: layout("Réservation confirmée ✅", "Atelier", inner),
  };
}

// B. Réservation annulée par le créateur (remboursement automatique si payée)
export function bookingCancelled(
  clientNom: string,
  label: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Bonjour ${esc(clientNom)}, votre réservation a été annulée par l'organisateur :
    </p>
    <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND};border-radius:12px;padding:14px 16px;font-size:14px;color:#444;line-height:1.6;">
      <strong>${esc(label)}</strong>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#777;">
      Si vous aviez réglé en ligne, le remboursement a été déclenché automatiquement.
    </p>`;
  return {
    subject: `Réservation annulée — ${label}`,
    html: layout("Réservation annulée", "Atelier", inner),
  };
}

// C. Liste d'attente — place obtenue, confirmée (paiement sur place)
export function waitlistPromoted(
  clientNom: string,
  label: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Bonne nouvelle ${esc(clientNom)} ! Une place s'est libérée et votre réservation est confirmée :
    </p>
    <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND};border-radius:12px;padding:14px 16px;font-size:14px;color:#444;line-height:1.6;">
      <strong>${esc(label)}</strong>
    </div>`;
  return {
    subject: `Place confirmée — ${label}`,
    html: layout("Une place s'est libérée 🎉", "Atelier", inner),
  };
}

// D. Liste d'attente — place obtenue, à payer pour confirmer (paiement en ligne)
export function waitlistPayToConfirm(
  clientNom: string,
  label: string,
  payUrl: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Bonne nouvelle ${esc(clientNom)} ! Une place s'est libérée pour :
    </p>
    <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND};border-radius:12px;padding:14px 16px;font-size:14px;color:#444;line-height:1.6;margin-bottom:20px;">
      <strong>${esc(label)}</strong>
    </div>
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Réglez en ligne pour confirmer votre place :
    </p>
    ${ctaButton(payUrl, "Payer ma place")}
    <p style="margin:20px 0 0;font-size:12px;color:#999;word-break:break-all;">Ou copiez ce lien : ${esc(payUrl)}</p>`;
  return {
    subject: `Une place s'est libérée — ${label}`,
    html: layout("Confirmez votre place ⏳", "Atelier", inner),
  };
}

// E. Atelier — complet au moment du paiement (course à la place) → remboursé
export function bookingFullRefunded(
  clientNom: string,
  label: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Désolé ${esc(clientNom)}, la dernière place vient d'être prise pour :
    </p>
    <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND};border-radius:12px;padding:14px 16px;font-size:14px;color:#444;line-height:1.6;">
      <strong>${esc(label)}</strong>
    </div>
    <p style="margin:16px 0 0;font-size:14px;color:#444;">
      Votre paiement a été <strong>intégralement remboursé</strong>. Vous êtes placé en liste d'attente : nous vous préviendrons si une place se libère.
    </p>`;
  return {
    subject: `Complet — remboursement effectué (${label})`,
    html: layout("Atelier complet — remboursé", "Atelier", inner),
  };
}

// 6. Artisan — demande refusée + motif
export function registrationRejected(
  artisanName: string,
  eventName: string,
  organizerNote?: string
): { subject: string; html: string } {
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">
      Bonjour ${esc(artisanName)}, votre demande de place au marché <strong>${esc(eventName)}</strong> n'a pas été retenue.
    </p>
    ${organizerNote ? `<p style="margin:0;font-size:13px;color:#777;"><strong>Message de l'organisateur :</strong> ${esc(organizerNote)}</p>` : ""}`;
  return {
    subject: `Demande non retenue — ${eventName}`,
    html: layout("Réponse à votre demande", eventName, inner),
  };
}
