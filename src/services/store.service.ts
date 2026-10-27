import { cache } from "react";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateSlug } from "@/lib/utils";
import type { Store } from "@/types";
import type { StoreSettingsInput } from "@/lib/validations/settings";

type StoreUpdate = Partial<StoreSettingsInput> &
  Partial<Pick<Store, "fulfillmentMethods" | "onboarding">>;

/**
 * Crée le doc boutique (slug + défauts) et marque l'utilisateur comme vendeur.
 * Réutilisé par l'inscription email/mot de passe et le flux Google (nom saisi
 * après coup). À appeler en tant que propriétaire (uid == storeId).
 */
export async function createStore(
  uid: string,
  storeName: string,
  country: string,
  profile?: { activity?: string; description?: string }
) {
  const slug = generateSlug(storeName);
  await setDoc(doc(db, "stores", uid), {
    id: uid,
    ownerId: uid,
    name: storeName,
    slug,
    country,
    description: profile?.description?.trim() ?? "",
    ...(profile?.activity?.trim() && { activity: profile.activity.trim() }),
    address: "",
    photoUrl: "",
    phone: "",
    pickupEnabled: true,
    localDeliveryEnabled: true,
    localDeliveryFee: 0,
    shippingEnabled: false,
    shippingFee: 0,
    fulfillmentMethods: ["pickup", "local_delivery"],
    schedulingEnabled: true,
    minimumNoticeHours: 24,
    maximumBookingDays: 90,
    createdAt: Timestamp.now(),
  });
  // L'utilisateur devient vendeur (merge : ne touche pas email/createdAt).
  await setDoc(
    doc(db, "users", uid),
    { storeName, role: "seller" },
    { merge: true }
  );
}

export async function getStoreByOwnerId(ownerId: string): Promise<Store | null> {
  const ref = doc(db, "stores", ownerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Store;
}

// cache() dédoublonne le fetch boutique au sein d'un même rendu serveur
// (layout + page + generateMetadata appellent tous getStoreBySlug). Côté
// client, cache() est un passe-plat sans effet.
export const getStoreBySlug = cache(
  async (slug: string): Promise<Store | null> => {
    const q = query(collection(db, "stores"), where("slug", "==", slug));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Store;
  }
);

export async function updateStore(storeId: string, data: StoreUpdate) {
  const ref = doc(db, "stores", storeId);
  // Firestore updateDoc() rejette toute valeur undefined (champs optionnels non
  // remplis, ex: lat/lng sans adresse) → on les retire avant l'écriture, sinon
  // tout le save échoue.
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  await updateDoc(ref, clean as Record<string, unknown>);
}

export async function updateStorePhoto(storeId: string, photoUrl: string) {
  const ref = doc(db, "stores", storeId);
  await updateDoc(ref, { photoUrl });
}
