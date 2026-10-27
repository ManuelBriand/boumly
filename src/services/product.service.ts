import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/types";

export function subscribeToProducts(
  creatorId: string,
  callback: (products: Product[]) => void
) {
  const q = query(collection(db, "products"), where("creatorId", "==", creatorId));
  return onSnapshot(q, (snap) => {
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
    callback(products.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
  });
}

export function subscribeToActiveProducts(
  creatorId: string,
  callback: (products: Product[]) => void
) {
  const q = query(
    collection(db, "products"),
    where("creatorId", "==", creatorId),
    where("active", "==", true)
  );
  return onSnapshot(q, (snap) => {
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
    callback(products);
  });
}

/**
 * Lecture one-shot des produits actifs d'une boutique (rendu serveur / SSR).
 * Même filtre que subscribeToActiveProducts, mais sans abonnement temps réel.
 */
export async function getActiveProducts(creatorId: string): Promise<Product[]> {
  const q = query(
    collection(db, "products"),
    where("creatorId", "==", creatorId),
    where("active", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function createProduct(
  creatorId: string,
  data: Record<string, unknown>
) {
  const ref = await addDoc(collection(db, "products"), {
    ...data,
    creatorId,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateProduct(
  productId: string,
  data: Record<string, unknown>
) {
  await updateDoc(doc(db, "products", productId), data);
}

export async function deleteProduct(productId: string) {
  await deleteDoc(doc(db, "products", productId));
}

export async function getProductById(productId: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, "products", productId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
}
