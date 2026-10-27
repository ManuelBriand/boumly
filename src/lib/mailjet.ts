// Client Mailjet minimal (Send API v3.1) sans dépendance — fetch + Basic auth.
// Envoi serveur uniquement. Best-effort : ne jette jamais, retourne { ok }.

const API_KEY = process.env.MAILJET_API_KEY;
const SECRET_KEY = process.env.MAILJET_SECRET_KEY;
const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL;
const FROM_NAME = process.env.MAILJET_FROM_NAME ?? "Boumly";

const SEND_URL = "https://api.mailjet.com/v3.1/send";

export interface SendMailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendMail({
  to,
  toName,
  subject,
  html,
  replyTo,
}: SendMailInput): Promise<{ ok: boolean }> {
  if (!API_KEY || !SECRET_KEY || !FROM_EMAIL) {
    console.warn("[mailjet] variables d'env manquantes — email ignoré:", subject);
    return { ok: false };
  }

  const auth = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString("base64");

  try {
    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: FROM_EMAIL, Name: FROM_NAME },
            To: [{ Email: to, Name: toName ?? to }],
            Subject: subject,
            HTMLPart: html,
            ...(replyTo && { ReplyTo: { Email: replyTo } }),
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[mailjet] envoi échoué", res.status, body);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[mailjet] erreur réseau", err);
    return { ok: false };
  }
}
