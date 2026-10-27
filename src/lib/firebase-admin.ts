import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// ⚠️ Serveur uniquement — utilise le service account, bypass les security rules.
function loadServiceAccount() {
  const b64 = process.env.FIREBASE_ADMIN_SA;
  if (!b64) {
    throw new Error("FIREBASE_ADMIN_SA manquant dans l'environnement");
  }
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

const app: App =
  getApps().length === 0
    ? initializeApp({ credential: cert(loadServiceAccount()) })
    : getApps()[0];

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
