import { sendMail } from "@/lib/mailjet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Destinataire du formulaire de contact. Fallback sur l'expéditeur vérifié Mailjet.
const CONTACT_TO = process.env.CONTACT_EMAIL ?? process.env.MAILJET_FROM_EMAIL;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Reçoit un message du formulaire de contact de la landing et l'envoie par email.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      message?: string;
    };

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const message = (body.message ?? "").trim();

    if (!name || !email || !message) {
      return Response.json({ error: "Champs manquants" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: "Email invalide" }, { status: 400 });
    }
    if (message.length > 5000) {
      return Response.json({ error: "Message trop long" }, { status: 400 });
    }
    if (!CONTACT_TO) {
      console.error("[contact] CONTACT_EMAIL / MAILJET_FROM_EMAIL manquant");
      return Response.json({ error: "Service indisponible" }, { status: 503 });
    }

    const html = `
      <div style="font-family:system-ui,sans-serif;color:#111827;line-height:1.6">
        <h2 style="color:#FF4D6D;margin:0 0 16px">Nouveau message de contact</h2>
        <p><strong>Nom :</strong> ${esc(name)}</p>
        <p><strong>Email :</strong> ${esc(email)}</p>
        <p><strong>Message :</strong></p>
        <p style="white-space:pre-wrap;background:#FFF1F4;padding:16px;border-radius:12px">${esc(message)}</p>
      </div>`;

    const { ok } = await sendMail({
      to: CONTACT_TO,
      subject: `[Boumly] Contact — ${name}`,
      html,
      replyTo: email,
    });

    if (!ok) {
      return Response.json({ error: "Envoi échoué" }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[contact]", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
