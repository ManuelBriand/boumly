import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { createStore } from "@/services/store.service";
import { trackLogin, trackSignUp } from "@/lib/analytics";
import type {
  RegisterInput,
  LoginInput,
  CustomerRegisterInput,
} from "@/lib/validations/auth";

// ─── Vendeur ──────────────────────────────────────────────────────
export async function signUp({ storeName, country, email, password }: RegisterInput) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    email,
    role: "seller",
    roles: ["seller"],
    storeName,
    createdAt: Timestamp.now(),
  });

  trackSignUp("password");

  await createStore(user.uid, storeName, country);

  return user;
}

// Inscription vendeur via Google : crée le doc utilisateur (role vendeur) mais
// PAS la boutique — le nom est demandé ensuite (écran de nommage du dashboard).
export async function signUpSellerWithGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider);
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: user.uid,
      email: user.email ?? "",
      role: "seller",
      roles: ["seller"],
      createdAt: Timestamp.now(),
    });
    trackSignUp("google");
  } else {
    trackLogin("google");
  }
  return user;
}

// ─── Client ───────────────────────────────────────────────────────
export async function signUpCustomer({ name, email, password }: CustomerRegisterInput) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    email,
    role: "customer",
    roles: ["customer"],
    name,
    createdAt: Timestamp.now(),
  });

  trackSignUp("password");
  return user;
}

const googleProvider = new GoogleAuthProvider();

// Codes émis quand l'utilisateur ferme lui-même la popup (ou en ouvre une
// seconde). Tout autre code est une vraie panne : il ne doit pas être présenté
// comme une annulation.
const POPUP_CANCEL_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

export function isPopupCancelled(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code !== undefined && POPUP_CANCEL_CODES.has(code);
}

export async function signInWithGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider);

  // Crée un doc client au premier login Google
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: user.uid,
      email: user.email ?? "",
      role: "customer",
      roles: ["customer"],
      name: user.displayName ?? "",
      createdAt: Timestamp.now(),
    });
    trackSignUp("google");
  } else {
    trackLogin("google");
  }
  return user;
}

// ─── Commun ───────────────────────────────────────────────────────
export async function signIn({ email, password }: LoginInput) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  trackLogin("password");
  return userCredential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

// Envoie l'email de réinitialisation (page d'action hébergée par Firebase).
export async function resetPassword(email: string, locale?: string) {
  if (locale) auth.languageCode = locale; // email localisé (fr/en)
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (e) {
    // Anti-énumération : un compte inexistant ne doit pas être révélé.
    if ((e as { code?: string }).code === "auth/user-not-found") return;
    throw e;
  }
}
