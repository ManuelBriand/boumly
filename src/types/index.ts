import type { Timestamp } from "firebase/firestore";
import type { ShippingZone } from "@/lib/regions";

export type UserRole = "seller" | "customer";

export interface User {
  id: string;
  email: string;
  role?: "seller" | "customer";   // legacy — absent = seller (back-compat). Déprécié au profit de roles.
  roles?: UserRole[];             // rôles cumulables. Absent → dérivé de role.
  name?: string;                  // nom client
  storeName?: string;             // vendeur
  country?: string;               // pays organisateur (ISO alpha-2) — requis avant Connect organisateur
  // ─── Stripe Connect organisateur (compte unique partagé entre ses événements) ───
  // L'identité KYC est par personne, pas par événement : le compte connecté vit sur
  // le doc utilisateur et est réutilisé par tous les événements de l'organisateur.
  stripeAccountId?: string;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeVerificationState?: StripeVerificationState;
  createdAt: Timestamp;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  activity?: string;           // activité artisanale (ex: "Bijoux fait main") — affichée aux organisateurs
  address?: string;            // adresse de la boutique (localisation + point de retrait)
  lat?: number;                // coords boutique (Mapbox), pour le rayon de livraison
  lng?: number;
  city?: string;               // deprecated — fallback d'affichage legacy
  country?: string;            // ISO alpha-2, utilisé par l'autocomplétion d'adresse
  photoUrl: string;
  phone?: string;
  email?: string;              // email de contact public (≠ email de compte)
  temporarilyClosed?: boolean; // fermeture temporaire — défaut false
  // ─── Modes de réception ─────────────────────────────────────────
  fulfillmentMethods?: FulfillmentMethod[];  // dérivé des booléens, persisté
  pickupEnabled?: boolean;
  localDeliveryEnabled?: boolean;
  localDeliveryFee?: number;
  localDeliveryRadiusKm?: number;  // rayon livraison locale en km (0/absent = pas de limite)
  shippingEnabled?: boolean;
  shippingFee?: number;              // legacy — fallback de migration vers shippingZones.national
  shippingZones?: {                 // tarifs d'expédition par palier
    national?: { enabled: boolean; fee: number };
    regional?: { enabled: boolean; fee: number };
    international?: { enabled: boolean; fee: number };
  };
  // ─── Commandes programmées ──────────────────────────────────────
  schedulingEnabled?: boolean;     // défaut true
  minimumNoticeHours?: number;     // défaut 24
  maximumBookingDays?: number;     // défaut 90
  cancellationPolicy?: string;     // conditions d'annulation perso (vide = défaut plateforme)
  socials?: SocialLinks;           // liens réseaux sociaux (handle ou URL)
  // ─── Stripe Connect (paiements + reversement) ───────────────────
  stripeAccountId?: string;        // id compte connecté Stripe (Accounts v2)
  stripeChargesEnabled?: boolean;  // onboarding terminé → peut encaisser
  stripePayoutsEnabled?: boolean;  // peut recevoir les virements (RIB validé)
  stripeVerificationState?: StripeVerificationState; // état KYC/vérification détaillé
  // ─── Onboarding (guidage nouvelle boutique) ─────────────────────
  onboarding?: {
    deliveryReviewed?: boolean;    // l'onglet livraison a été ouvert une fois
    dismissed?: boolean;           // bannière de succès fermée par le vendeur
  };
  createdAt: Timestamp;
}

export type StripeVerificationState =
  | "verified"
  | "pending"
  | "action_required"
  | "contact_stripe"
  | "incomplete";

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "whatsapp"
  | "website";

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export type FulfillmentMethod = "pickup" | "local_delivery" | "shipping";

// Libellés + icônes partagés (source unique pour checkout, dashboard, confirmation)
export const FULFILLMENT_LABELS: Record<FulfillmentMethod, string> = {
  pickup: "À emporter",
  local_delivery: "Livraison locale",
  shipping: "Expédition",
};

export interface ProductOption {
  name: string;                          // "Goût", "Couleur", "Taille"
  values: string[];                      // ["Vanille", "Chocolat"] — max 10
  adjustments: Record<string, number>;  // { "Grand": 3, "Petit": 0 } — ajout au prix de base
}

export interface ProductVariant {
  id: string;                          // slug généré ex: "vanille-petit"
  options: Record<string, string>;     // { "Goût": "Vanille", "Taille": "Petit" }
  stock: number | null;                // null = illimité
  enabled: boolean;
}

export interface CustomField {
  label: string;      // "Prénom à graver", "Message sur le gâteau"
  required: boolean;
}

export interface Product {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  price: number;           // prix de base (utilisé si pas de variantes)
  imageUrl: string;        // image principale (rétrocompat)
  images: string[];        // galerie — toutes les images (max 5)
  active: boolean;
  options: ProductOption[];
  variants: ProductVariant[];
  stock?: number | null;       // stock produit simple (null = illimité)
  trackStock: boolean;
  customField?: CustomField;
  createdAt: Timestamp;
}

export type DiscountType = "percentage" | "fixed";

export interface PromoCode {
  id: string;
  storeId: string;            // == ownerId (boutique propriétaire du code)
  code: string;              // stocké en MAJUSCULES, sans espaces
  discountType: DiscountType; // "percentage" (=%) ou "fixed" (=€)
  discountValue: number;      // 10 → -10% ou -10€ selon discountType
  active: boolean;
  expiresAt?: string;         // ISO yyyy-mm-dd, optionnel — dernier jour valable inclus
  maxUses?: number;           // optionnel — nb max de commandes payées
  usedCount: number;          // compteur d'utilisations (commandes payées), démarre à 0
  minOrderAmount?: number;    // optionnel — sous-total minimum (€) requis
  createdAt: Timestamp;
}

export type OrderStatus = "new" | "preparing" | "ready" | "completed";

export interface OrderItem {
  productId?: string;          // absent pour une ligne libre (commande manuelle)
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  variantId?: string;
  variantLabel?: string;       // "Vanille — Petit" (lisible pour le vendeur)
  customFieldValue?: string;
}

export interface Order {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  currency?: string;       // devise ISO 4217 (minuscule) figée au paiement — absent = eur (legacy)
  promoCode?: string;      // code promo appliqué (MAJUSCULES)
  discount?: number;       // montant € déduit du sous-total par le code promo
  status: OrderStatus;
  fulfillmentMethod: FulfillmentMethod;
  fulfillmentFee: number;
  shippingZone?: ShippingZone; // palier d'expédition appliqué (traçabilité)
  address?: string;        // local_delivery + shipping
  addressComplement?: string; // numéro, étage, bâtiment, interphone, instructions
  zipCode?: string;
  city?: string;
  requestedDate?: string;  // pickup + local_delivery (ISO yyyy-mm-dd)
  requestedTime?: string;  // optionnel (HH:mm)
  note?: string;           // note libre du client pour le vendeur
  customerId?: string;     // uid client connecté (absent = anonyme)
  manual?: boolean;        // commande créée à la main par le vendeur
  payment?: "online" | "cash" | "none"; // mode d'encaissement (manuel)
  storeName?: string;      // snapshot pour l'historique client
  storeSlug?: string;
  cancellationPolicy?: string;        // snapshot des conditions d'annulation acceptées
  cancellationPolicyAccepted?: boolean; // le client a coché l'acceptation au checkout
  // ─── Paiement (Stripe) ──────────────────────────────────────────
  paid?: boolean;              // false tant que le webhook n'a pas confirmé
  paymentIntentId?: string;    // PaymentIntent Stripe associé
  applicationFee?: number;     // commission plateforme prélevée (€)
  stripeFee?: number;          // frais de paiement Stripe réels (€), posés par le webhook
  netAmount?: number;          // net reversé au vendeur (€). Estimé à la création
                               // (total − commission), réajusté exact par le webhook
                               // (balance_transaction.net : − commission − frais Stripe)
  notifiedAt?: string;         // emails transactionnels envoyés (garde anti-doublon webhook)
  createdAt: Timestamp;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variantId?: string;
  selectedOptions?: Record<string, string>;
  customFieldValue?: string;
}

// ─── Organisateur d'événement ───────────────────────────────────────

// Type d'événement — extensible sans migration (salon, concert…). Le label
// visible reste "Marché" tant que seul "market" est utilisé côté produit.
export type EventType = "market" | "fair" | "concert";

export type EventStatus = "draft" | "published" | "archived";

export interface EventSchedule {
  type: "recurring" | "oneoff";
  frequency?: "weekly" | "monthly" | "custom";
  nextDates: Timestamp[];
  description: string;            // ex: "1er dimanche du mois"
}

export interface EventPricing {
  type: "fixed" | "variable" | "both";
  fixedPrice?: number;            // centimes
  categories?: { name: string; price: number }[]; // price en centimes
}

export interface Event {
  id: string;
  slug: string;                   // auto-généré depuis le nom
  type: EventType;                // "market" par défaut
  organizerId: string;            // → User.id
  name: string;
  description: string;
  photoUrl: string;
  address: string;
  lat: number;
  lng: number;
  country: string;                // ISO alpha-2
  schedule: EventSchedule;
  pricing: EventPricing;
  currency: string;
  capacity?: number;
  registrationOpen: boolean;
  inviteCode: string;             // 8 chars [A-Z0-9], unique
  status: EventStatus;
  // Miroir des flags Connect de l'organisateur (lecture rapide, écrit serveur).
  stripeAccountId?: string;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type EventRegistrationStatus =
  | "pending"
  | "approved"
  | "payment_pending"
  | "paid"
  | "rejected"
  | "cancelled";

export interface EventRegistration {
  id: string;
  eventId: string;
  eventName: string;              // dénormalisé → affichage "Mes demandes" côté artisan sans relire l'événement
  eventSlug: string;              // dénormalisé → lien de paiement /event/{slug}/register
  organizerId: string;            // dénormalisé → règle de lecture organisateur sans jointure
  storeId: string;
  userId: string;
  categoryName?: string;
  amount: number;                 // centimes
  currency: string;
  status: EventRegistrationStatus;
  note?: string;                  // artisan → organisateur
  organizerNote?: string;         // organisateur → artisan
  stripePaymentIntentId?: string;
  applicationFee?: number;
  stripeFee?: number;
  netAmount?: number;
  notifiedAt?: string;            // garde anti-doublon webhook (comme Order)
  paidAt?: Timestamp;
  rejectedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Prestations / ateliers (réservation sur créneaux) ──────────────
// Terme technique générique « prestation » (ateliers, cours, coaching…) — le
// wording visible côté UI reste « Atelier ». Rattachée à la boutique (produit du
// créateur), pas à l'utilisateur. Écrite serveur uniquement (Admin SDK).

export type PaiementMode = "immediat" | "sur_place";

// Récurrent : créneaux générés auto sur 8 semaines glissantes (cron).
// Ponctuel  : dates précises saisies à la main, créneaux créés une fois (pas de cron).
export type ModeRecurrence = "recurrent" | "ponctuel";

// Un horaire hebdomadaire récurrent : jour de la semaine + heure murale.
export interface HoraireRecurrent {
  jour: number;   // 0 = dimanche … 6 = samedi
  heure: string;  // "HH:mm"
}

export interface Prestation {
  id: string;
  slug: string;                   // auto-généré depuis le nom, unique
  boutiqueId: string;             // == Store.id == ownerId (uid propriétaire)
  nom: string;
  description: string;
  photoUrl: string;
  dureeMinutes: number;
  capaciteMax: number;            // capacité par défaut, surchargeable au créneau
  prix: number;                   // centimes (unité mineure)
  currency: string;               // figée depuis la boutique (pays)
  modePaiement: PaiementMode;
  modeRecurrence: ModeRecurrence; // absence (docs legacy) = récurrent
  // récurrent : horaires hebdo (jour 0=dim…6=sam + "HH:mm"). Plusieurs entrées par
  // jour possibles (heures multiples) et heures différentes selon les jours.
  horairesRecurrence?: HoraireRecurrent[];
  datesPonctuelles?: string[];    // ponctuel : ISO "yyyy-mm-ddTHH:mm"
  // ─── Legacy (docs v2) : un seul créneau/jour partagé. Lu en repli. ───
  joursRecurrence?: number[];
  heureRecurrence?: string;
  actif: boolean;                 // désactivable sans suppression
  // Miroir des flags Connect de la boutique (lecture rapide page publique).
  stripeAccountId?: string;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreneauStatut = "ouvert" | "annule_createur" | "termine";

export interface Creneau {
  id: string;                     // == slotKey "{prestationId}_{yyyy-mm-ddTHH:mm}"
  prestationId: string;
  boutiqueId: string;             // dénormalisé (requêtes + règles)
  dateHeure: Timestamp;
  capaciteMax: number;            // copiée de la prestation, éditable ensuite
  capaciteRestante: number;
  statut: CreneauStatut;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ReservationStatut =
  | "confirmee"
  | "en_attente"
  | "payment_pending"       // mode immédiat : place tenue avant confirmation webhook
  | "annulee_createur"
  | "terminee";
// Modèle extensible : un futur "annulee_client" s'ajoute sans migration.

export interface Reservation {
  id: string;
  creneauId: string;
  prestationId: string;
  boutiqueId: string;             // dénormalisé → règle de lecture créateur
  clientId: string;               // uid du client (compte obligatoire)
  clientEmail: string;
  clientNom: string;
  prestationNom?: string;         // snapshot pour l'historique client (récap account)
  prestationSlug?: string;        // snapshot pour le lien vers la fiche atelier
  dateHeure?: Timestamp;          // snapshot du créneau (affichage sans jointure)
  statut: ReservationStatut;
  amount: number;                 // centimes
  currency: string;
  paiementStripeId?: string;      // rempli si modePaiement == immediat
  applicationFee?: number;
  stripeFee?: number;
  netAmount?: number;
  notifiedAt?: string;            // garde anti-doublon webhook (comme Order)
  paidAt?: Timestamp;
  createdAt: Timestamp;           // = ordre de priorité liste d'attente
  updatedAt: Timestamp;
}
