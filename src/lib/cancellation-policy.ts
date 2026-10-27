/**
 * Conditions d'annulation par défaut de la plateforme.
 * Utilisées quand un vendeur n'a pas personnalisé ses propres conditions
 * (champ `Store.cancellationPolicy` vide). Affichées et acceptées au checkout,
 * puis snapshottées sur la commande comme preuve.
 */
export const DEFAULT_CANCELLATION_POLICY =
  "Les commandes peuvent être annulées jusqu'à 48h avant la date prévue.\n\n" +
  "Passé ce délai, la commande est considérée comme due et ne pourra pas être remboursée, sauf accord du vendeur.\n\n" +
  "Pour les produits personnalisés ou sur mesure, aucune annulation n'est possible une fois la production commencée.";
