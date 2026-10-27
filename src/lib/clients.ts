import type { Order, Reservation, EventRegistration, Store } from "@/types";
import { fromMinorUnits } from "@/lib/countries";

export interface ClientSummary {
  key: string;
  connected: boolean;   // true si l'achat le plus récent est rattaché à un compte
  name: string;
  email: string;
  phone: string;
  orderCount: number;   // nombre total d'achats (commandes + ateliers + stands)
  totalSpent: number;   // somme des montants (unité majeure)
  lastOrderAt: number;  // ms (plus récent), pour tri
}

// Achat normalisé : commande boutique, réservation d'atelier ou stand de marché.
export interface Purchase {
  key: string;
  connected: boolean;
  name: string;
  email: string;
  phone: string;
  amount: number;   // unité majeure
  at: number;       // ms
}

/**
 * Clé d'identité d'un client : email en priorité, puis téléphone / id en secours.
 * Regroupe achats anonymes et connectés d'un même email, tous canaux confondus.
 */
export function clientKey(o: Order): string {
  return (
    o.customerEmail?.trim().toLowerCase() ||
    o.customerPhone ||
    o.customerId ||
    o.id
  );
}

// Clés d'identité par canal (mêmes règles que clientKey, réutilisées par la page
// détail pour retrouver les achats d'un client tous canaux confondus).
export function reservationKey(r: Reservation): string {
  return r.clientEmail?.trim().toLowerCase() || r.clientId || r.id;
}
export function registrationKey(r: EventRegistration, store: Store | null): string {
  return (store?.email ?? "").trim().toLowerCase() || store?.slug || r.storeId;
}

function orderPurchase(o: Order): Purchase {
  return {
    key: clientKey(o),
    connected: !!o.customerId,
    name: o.customerName,
    email: o.customerEmail,
    phone: o.customerPhone,
    amount: o.total,
    at: o.createdAt.toMillis(),
  };
}

// Réservations d'ateliers confirmées (payées / sur place) → achats client.
// On ignore en_attente / payment_pending / annulée : pas un client acquis.
export function reservationPurchases(reservations: Reservation[]): Purchase[] {
  return reservations
    .filter((r) => r.statut === "confirmee" || r.statut === "terminee")
    .map((r) => ({
      key: reservationKey(r),
      connected: !!r.clientId,
      name: r.clientNom ?? "Client",
      email: r.clientEmail ?? "",
      phone: "",
      amount: fromMinorUnits(r.amount ?? 0, r.currency ?? "eur"),
      at: r.createdAt.toMillis(),
    }));
}

// Inscriptions marché payées (stands) → achats client. Le contact vient de la
// boutique de l'artisan (doc public), fournie via `storeById`.
export function registrationPurchases(
  registrations: EventRegistration[],
  storeById: Map<string, Store | null>
): Purchase[] {
  return registrations
    .filter((r) => r.status === "paid")
    .map((r) => {
      const store = storeById.get(r.storeId) ?? null;
      const email = store?.email ?? "";
      return {
        key: registrationKey(r, store),
        connected: true,
        name: store?.name ?? "Artisan",
        email,
        phone: store?.phone ?? "",
        amount: fromMinorUnits(r.amount ?? 0, r.currency ?? "eur"),
        at: r.createdAt.toMillis(),
      };
    });
}

/**
 * Agrège tous les achats par client (commandes + `extras` : ateliers, stands).
 * name/email/phone proviennent de l'achat le plus récent. Tri décroissant.
 */
export function deriveClients(orders: Order[], extras: Purchase[] = []): ClientSummary[] {
  const purchases = [...orders.map(orderPurchase), ...extras];
  const map = new Map<string, ClientSummary>();
  for (const p of purchases) {
    const existing = map.get(p.key);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += p.amount;
      if (p.at > existing.lastOrderAt) {
        existing.lastOrderAt = p.at;
        existing.connected = p.connected;
        existing.name = p.name;
        existing.email = p.email;
        existing.phone = p.phone;
      }
    } else {
      map.set(p.key, {
        key: p.key,
        connected: p.connected,
        name: p.name,
        email: p.email,
        phone: p.phone,
        orderCount: 1,
        totalSpent: p.amount,
        lastOrderAt: p.at,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.lastOrderAt - a.lastOrderAt);
}
