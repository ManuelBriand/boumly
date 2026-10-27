import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function CguPage() {
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
          Conditions générales d’utilisation (CGU)
        </h1>
        <p className="mt-3 text-sm text-[#6B7280]">Dernière mise à jour : 12 juin 2026</p>

        <div className="mt-10 space-y-10 text-[#374151] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#111827]">1. Objet</h2>
            <p className="mt-3">
              Les présentes Conditions Générales d’Utilisation régissent l’accès et l’utilisation
              de la plateforme Boumly.
            </p>
            <p className="mt-3">
              Boumly est une plateforme permettant à des vendeurs indépendants de créer une
              boutique en ligne, présenter leurs produits, recevoir des commandes et encaisser des
              paiements.
            </p>
            <p className="mt-3">
              L’utilisation de la plateforme implique l’acceptation sans réserve des présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">2. Éditeur</h2>
            <p className="mt-3">La plateforme Boumly est exploitée par :</p>
            <p className="mt-3">
              <strong className="text-[#111827]">Manuel Briand EI</strong>
            </p>
            <p className="mt-3">SIREN : [SIREN]</p>
            <p className="mt-3">
              Adresse :
              <br />
              [Adresse de l’éditeur]
              <br />
              [Code postal, ville]
              <br />
              France
            </p>
            <p className="mt-3">
              Email :
              <br />
              <a href="mailto:contact@boumly.com" className="text-[#FF4D6D] hover:underline">
                contact@boumly.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">3. Description du service</h2>
            <p className="mt-3">
              Boumly met à disposition des vendeurs des outils permettant notamment :
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>la création d’une boutique en ligne ;</li>
              <li>la gestion des produits ;</li>
              <li>la réception de commandes ;</li>
              <li>la gestion des paiements via Stripe Connect ;</li>
              <li>la gestion des commandes et de leur suivi.</li>
            </ul>
            <p className="mt-3">
              Boumly agit uniquement en qualité de fournisseur de services techniques.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">4. Création de compte</h2>
            <p className="mt-3">L’utilisateur doit fournir des informations exactes et à jour.</p>
            <p className="mt-3">
              L’utilisateur est responsable de la confidentialité de ses identifiants de connexion.
            </p>
            <p className="mt-3">
              Toute activité réalisée depuis son compte est réputée effectuée par lui.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">5. Responsabilité du vendeur</h2>
            <p className="mt-3">Le vendeur est seul responsable :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>des produits ou services proposés ;</li>
              <li>des descriptions publiées ;</li>
              <li>des prix affichés ;</li>
              <li>du respect des lois applicables à son activité ;</li>
              <li>de la gestion des commandes ;</li>
              <li>des délais de livraison ;</li>
              <li>des annulations ;</li>
              <li>des remboursements ;</li>
              <li>du service client.</li>
            </ul>
            <p className="mt-3">
              Le vendeur garantit disposer de tous les droits nécessaires à la commercialisation
              des produits proposés.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">6. Rôle de Boumly</h2>
            <p className="mt-3">
              Boumly n’est jamais partie au contrat conclu entre un vendeur et son client.
            </p>
            <p className="mt-3">
              Boumly n’est ni fabricant, ni distributeur, ni revendeur des produits proposés sur
              les boutiques.
            </p>
            <p className="mt-3">
              Boumly ne garantit ni la qualité des produits, ni la bonne exécution des commandes.
            </p>
            <p className="mt-3">
              Tout litige relatif à une commande doit être traité directement entre le vendeur et
              son client.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">7. Paiements</h2>
            <p className="mt-3">Les paiements sont traités par Stripe Connect.</p>
            <p className="mt-3">Le vendeur accepte les conditions applicables de Stripe.</p>
            <p className="mt-3">Boumly n’a jamais accès aux données bancaires des clients.</p>
            <p className="mt-3">Les fonds sont traités conformément aux règles définies par Stripe.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">8. Commission</h2>
            <p className="mt-3">
              Boumly prélève une commission de 5 % sur les commandes payées réalisées via la
              plateforme.
            </p>
            <p className="mt-3">
              Les frais de traitement des paiements appliqués par Stripe sont facturés en
              supplément et restent à la charge du vendeur.
            </p>
            <p className="mt-3">Boumly se réserve le droit de modifier sa tarification à tout moment.</p>
            <p className="mt-3">
              Toute modification sera communiquée aux utilisateurs avec un préavis raisonnable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">9. Produits interdits</h2>
            <p className="mt-3">Il est interdit de vendre ou promouvoir sur Boumly :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>des produits illicites ;</li>
              <li>des contrefaçons ;</li>
              <li>des armes ;</li>
              <li>des stupéfiants ;</li>
              <li>des produits dangereux ou réglementés sans autorisation ;</li>
              <li>des contenus haineux, discriminatoires ou contraires à l’ordre public.</li>
            </ul>
            <p className="mt-3">
              Boumly peut suspendre immédiatement tout compte ne respectant pas ces règles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">
              10. Suspension et suppression de compte
            </h2>
            <p className="mt-3">
              Boumly peut suspendre ou supprimer un compte notamment en cas :
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>de fraude ;</li>
              <li>d’activité illégale ;</li>
              <li>de non-respect des présentes CGU ;</li>
              <li>de risque pour la sécurité de la plateforme ;</li>
              <li>de litiges répétés avec des clients.</li>
            </ul>
            <p className="mt-3">
              La suspension ou suppression peut intervenir sans préavis en cas de faute grave.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">11. Disponibilité du service</h2>
            <p className="mt-3">Boumly s’efforce d’assurer la disponibilité du service.</p>
            <p className="mt-3">Toutefois, aucun niveau de disponibilité n’est garanti.</p>
            <p className="mt-3">
              Des interruptions temporaires peuvent intervenir pour maintenance, mise à jour ou
              incident technique.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">12. Limitation de responsabilité</h2>
            <p className="mt-3">
              La responsabilité totale de Boumly ne pourra être engagée qu’en cas de faute prouvée.
            </p>
            <p className="mt-3">En aucun cas Boumly ne pourra être tenu responsable :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>des pertes de chiffre d’affaires ;</li>
              <li>des pertes de clientèle ;</li>
              <li>des pertes de données imputables à un tiers ;</li>
              <li>des litiges entre vendeurs et clients ;</li>
              <li>des erreurs de saisie réalisées par les utilisateurs ;</li>
              <li>des dommages indirects.</li>
            </ul>
            <p className="mt-3">
              Dans tous les cas, la responsabilité totale de Boumly est limitée aux sommes
              effectivement perçues par Boumly au cours des douze derniers mois précédant le litige.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">13. Propriété intellectuelle</h2>
            <p className="mt-3">
              La marque Boumly, les logiciels, interfaces, logos, graphismes et contenus de la
              plateforme sont protégés par les lois relatives à la propriété intellectuelle.
            </p>
            <p className="mt-3">
              Toute reproduction ou exploitation sans autorisation est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">14. Modification des CGU</h2>
            <p className="mt-3">Boumly peut modifier les présentes CGU à tout moment.</p>
            <p className="mt-3">
              La version applicable est celle en vigueur à la date d’utilisation du service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">15. Droit applicable</h2>
            <p className="mt-3">Les présentes CGU sont soumises au droit français.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">16. Juridiction compétente</h2>
            <p className="mt-3">
              En cas de litige, les parties rechercheront une solution amiable.
            </p>
            <p className="mt-3">À défaut, les tribunaux français seront seuls compétents.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
