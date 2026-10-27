"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getStoreByOwnerId } from "@/services/store.service";
import type { Store, User, UserRole } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  store: Store | null;
  role: "seller" | "customer" | null;   // legacy — rôle "principal" rétro-compatible
  roles: UserRole[];                      // rôles cumulables normalisés
  isSeller: boolean;
  isCustomer: boolean;
  loading: boolean;
  refreshStore: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  store: null,
  role: null,
  roles: [],
  isSeller: false,
  isCustomer: false,
  loading: true,
  refreshStore: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshStore() {
    // auth.currentUser : dispo même juste après signUp, avant que le state
    // firebaseUser ne soit mis à jour par onAuthStateChanged.
    const uid = auth.currentUser?.uid ?? firebaseUser?.uid;
    if (!uid) return;
    const storeData = await getStoreByOwnerId(uid);
    setStore(storeData);
  }

  // Recharge user ET store (ex. juste après un sign-in Google où le doc users
  // vient d'être créé → role doit être connu avant le rendu du dashboard).
  async function refreshAuth() {
    const uid = auth.currentUser?.uid ?? firebaseUser?.uid;
    if (!uid) return;
    const [userSnap, storeData] = await Promise.all([
      getDoc(doc(db, "users", uid)),
      getStoreByOwnerId(uid),
    ]);
    setUser(userSnap.exists() ? (userSnap.data() as User) : null);
    setStore(storeData);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const [userSnap, storeData] = await Promise.all([
            getDoc(doc(db, "users", fbUser.uid)),
            getStoreByOwnerId(fbUser.uid),
          ]);
          setUser(userSnap.exists() ? (userSnap.data() as User) : null);
          setStore(storeData);
        } catch {
          setUser(null);
          setStore(null);
        }
      } else {
        setUser(null);
        setStore(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Rôle legacy : explicite via user.role ; sinon déduit (store présent → seller)
  const role: "seller" | "customer" | null = firebaseUser
    ? (user?.role ?? (store ? "seller" : "customer"))
    : null;

  // Rôles cumulables normalisés : user.roles si présent, sinon dérivé du legacy.
  // On réinjecte TOUJOURS le rôle legacy (`user.role`) pour ne pas masquer la
  // boutique d'un vendeur historique dont le tableau `roles` serait incomplet.
  const derived: UserRole[] = user?.roles?.length ? user.roles : role ? [role] : [];
  const roles: UserRole[] = firebaseUser
    ? Array.from(new Set<UserRole>([...derived, ...(user?.role ? [user.role] : [])]))
    : [];

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        store,
        role,
        roles,
        isSeller: roles.includes("seller"),
        isCustomer: roles.includes("customer"),
        loading,
        refreshStore,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
