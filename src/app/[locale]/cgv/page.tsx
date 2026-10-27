import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function CgvPage() {
  return (
    <div className="bg-white min-h-screen">
      <header className="border-b border-[#E5E7EB] py-5 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#FF4D6D] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-[#111827] text-lg tracking-tight">Boumly</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l’accueil
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-[#111827] tracking-tight">
          Conditions générales de vente (CGV)
        </h1>
        <p className="mt-3 text-sm text-[#6B7280]">Dernière mise à jour : 12 juin 2026</p>

        <div className="mt-10 space-y-10 text-[#374151] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#111827]">1. Objet</h2>
            <p className="mt-3">
              Les présentes Conditions Générales de Vente ont pour objet de définir les conditions
              dans lesquelles Boumly fournit un service de mise à disposition d’une plateforme
              technique permettant à des vendeurs indépendants de créer et gérer une boutique en
              ligne, recevoir des commandes et encaisser des paiements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">2. Éditeur du service</h2>
            <p className="mt-3">Boumly est exploité par :</p>
            <p className="mt-3">
              <strong className="text-[#111827]">Manuel Briand EI</strong>
              <br />
              SIREN : [SIREN]
              <br />
              Adresse : [Adresse de l’éditeur]
              <br />
              Email :{" "}
              <a href="mailto:contact@boumly.com" className="text-[#FF4D6D] hover:underline">
                contact@boumly.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">3. Nature du service</h2>
            <p className="mt-3">
              Boumly est une plateforme technique permettant la mise en relation entre des vendeurs
              indépendants et leurs clients.
            </p>
            <p className="mt-3">
              Boumly n’agit pas en qualité de vendeur, revendeur, fabricant ou distributeur des
              produits proposés par les vendeurs.
            </p>
            <p className="mt-3">
              Les contrats de vente sont conclus directement entre le vendeur et son client.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">4. Accès au service</h2>
            <p className="mt-3">
              Le service Boumly est accessible à toute personne physique ou morale créant une
              boutique sur la plateforme.
            </p>
            <p className="mt-3">
              L’accès peut être gratuit ou soumis à une commission sur les ventes réalisées via la
              plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">5. Commission Boumly</h2>
            <p className="mt-3">
              Boumly prélève une commission de 5 % sur le montant des commandes payées réalisées
              via la plateforme.
            </p>
            <p className="mt-3">
              Cette commission est automatiquement prélevée via Stripe Connect lors du traitement
              du paiement.
            </p>
            <p className="mt-3">
              Les frais de traitement des paiements appliqués par Stripe sont indépendants et
              s’ajoutent à cette commission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">6. Paiement et reversement</h2>
            <p className="mt-3">Les paiements sont traités via Stripe Connect.</p>
            <p className="mt-3">
              Les fonds sont collectés par Stripe puis reversés au vendeur, déduction faite :
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>de la commission Boumly ;</li>
              <li>des frais de traitement Stripe.</li>
            </ul>
            <p className="mt-3">Boumly n’encaisse pas directement les fonds des clients.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">7. Responsabilités</h2>
            <p className="mt-3">
              Boumly agit uniquement en qualité d’intermédiaire technique.
            </p>
            <p className="mt-3">Le vendeur est seul responsable :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>des produits et services proposés ;</li>
              <li>des prix affichés ;</li>
              <li>de la conformité légale de son activité ;</li>
              <li>de la gestion des commandes ;</li>
              <li>des délais de livraison ;</li>
              <li>des annulations et remboursements ;</li>
              <li>du service client.</li>
            </ul>
            <p className="mt-3">
              Boumly ne saurait être tenu responsable des litiges entre vendeurs et clients.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">8. Absence de garantie sur les ventes</h2>
            <p className="mt-3">
              Boumly ne garantit aucun volume de ventes, aucune visibilité ni aucun résultat
              commercial pour les vendeurs utilisant la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">9. Droit de modification</h2>
            <p className="mt-3">Boumly se réserve le droit de modifier à tout moment :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>la structure de ses commissions ;</li>
              <li>les fonctionnalités du service ;</li>
              <li>les conditions d’accès à la plateforme.</li>
            </ul>
            <p className="mt-3">
              Toute modification sera notifiée aux utilisateurs dans un délai raisonnable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">10. Suspension et résiliation</h2>
            <p className="mt-3">
              Boumly se réserve le droit de suspendre ou résilier l’accès à un compte vendeur en cas
              de :
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>non-respect des présentes CGV ou CGU ;</li>
              <li>activité frauduleuse ou illégale ;</li>
              <li>risque pour la sécurité de la plateforme ;</li>
              <li>litiges répétés avec des clients ;</li>
              <li>comportement abusif.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">11. Rétractation et annulation</h2>
            <p className="mt-3">
              Les conditions de rétractation et d’annulation sont définies directement par chaque
              vendeur pour ses propres produits.
            </p>
            <p className="mt-3">
              Boumly n’intervient pas dans la gestion des remboursements entre vendeur et client.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">12. Propriété des données</h2>
            <p className="mt-3">
              Le vendeur conserve l’entière propriété de ses contenus, produits et données.
            </p>
            <p className="mt-3">
              Boumly dispose uniquement d’un droit d’usage technique nécessaire au fonctionnement du
              service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">13. Limitation de responsabilité</h2>
            <p className="mt-3">
              La responsabilité de Boumly est limitée à la fourniture du service technique.
            </p>
            <p className="mt-3">En aucun cas Boumly ne pourra être tenu responsable :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>des pertes de chiffre d’affaires ;</li>
              <li>des pertes de données ;</li>
              <li>des litiges entre vendeurs et clients ;</li>
              <li>des erreurs commises par les vendeurs ;</li>
              <li>des dommages indirects.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">14. Droit applicable</h2>
            <p className="mt-3">Les présentes CGV sont régies par le droit français.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">15. Litiges</h2>
            <p className="mt-3">
              En cas de litige, une solution amiable sera recherchée prioritairement.
            </p>
            <p className="mt-3">
              À défaut, les tribunaux compétents seront ceux du ressort du siège de l’activité.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
