import { adminAuth } from "@/lib/firebase-admin";

/** Erreur HTTP typée — convertie en Response par les route handlers. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Vérifie le Firebase ID token passé en `Authorization: Bearer <token>`.
 * Retourne le uid du vendeur. Throw HttpError(401) si absent/invalide.
 */
export async function requireUid(request: Request): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Token manquant");
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new HttpError(401, "Token invalide");
  }
}
