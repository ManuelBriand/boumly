import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PromoCode } from "@/types";

// id de doc déterministe — unique par boutique (même règle que le serveur).
export const promoDocId = (storeId: string, code: string) =>
  `${storeId}_${code.trim().toUpperCase()}`;

export function subscribeToPromoCodes(
  storeId: string,
  callback: (codes: PromoCode[]) => void
) {
  const q = query(collection(db, "promoCodes"), where("storeId", "==", storeId));
  return onSnapshot(q, (snap) => {
    const codes = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PromoCode));
    callback(codes.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
  });
}

export interface PromoInput {
  code: string;
  discountType: PromoCode["discountType"];
  discountValue: number;
  active: boolean;
  expiresAt?: string;
  maxUses?: number;
  minOrderAmount?: number;
}

/**
 * Crée un code. L'unicité par boutique est garantie par l'id déterministe ;
 * la garde anti-doublon (UX) se fait côté page via la liste abonnée — pas de
 * getDoc ici : un read sur un doc inexistant est refusé par les règles.
 */
export async function createPromoCode(storeId: string, data: PromoInput) {
  const code = data.code.trim().toUpperCase();
  const id = promoDocId(storeId, code);
  const ref = doc(db, "promoCodes", id);
  await setDoc(ref, {
    storeId,
    code,
    discountType: data.discountType,
    discountValue: data.discountValue,
    active: data.active,
    usedCount: 0,
    ...(data.expiresAt ? { expiresAt: data.expiresAt } : {}),
    ...(typeof data.maxUses === "number" ? { maxUses: data.maxUses } : {}),
    ...(typeof data.minOrderAmount === "number"
      ? { minOrderAmount: data.minOrderAmount }
      : {}),
    createdAt: Timestamp.now(),
  });
  return id;
}

/** Met à jour un code (le code lui-même n'est pas modifiable — il sert d'id). */
export async function updatePromoCode(
  promoId: string,
  data: Omit<PromoInput, "code">
) {
  await updateDoc(doc(db, "promoCodes", promoId), {
    discountType: data.discountType,
    discountValue: data.discountValue,
    active: data.active,
    // null efface le champ optionnel si décoché
    expiresAt: data.expiresAt ?? null,
    maxUses: typeof data.maxUses === "number" ? data.maxUses : null,
    minOrderAmount:
      typeof data.minOrderAmount === "number" ? data.minOrderAmount : null,
  });
}

export async function togglePromoCode(promoId: string, active: boolean) {
  await updateDoc(doc(db, "promoCodes", promoId), { active });
}

export async function deletePromoCode(promoId: string) {
  await deleteDoc(doc(db, "promoCodes", promoId));
}
