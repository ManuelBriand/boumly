import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function PolitiqueConfidentialitePage() {
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
          Politique de confidentialité
        </h1>
        <p className="mt-3 text-sm text-[#6B7280]">Dernière mise à jour : 12 juin 2026</p>

        <div className="mt-10 space-y-10 text-[#374151] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#111827]">1. Responsable du traitement</h2>
            <p className="mt-3">
              Les données personnelles collectées sur la plateforme Boumly sont traitées par :
            </p>
            <p className="mt-3">
              <strong className="text-[#111827]">Manuel Briand EI</strong>
              <br />
              Entrepreneur individuel
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
            <h2 className="text-xl font-bold text-[#111827]">2. Données collectées</h2>
            <p className="mt-3">
              Dans le cadre de l’utilisation de Boumly, nous pouvons collecter les données
              suivantes :
            </p>

            <h3 className="mt-5 font-semibold text-[#111827]">Informations de compte :</h3>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>nom ;</li>
              <li>prénom ;</li>
              <li>adresse email ;</li>
              <li>mot de passe (chiffré et géré par Firebase Authentication).</li>
            </ul>

            <h3 className="mt-5 font-semibold text-[#111827]">Informations de boutique :</h3>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>nom de la boutique ;</li>
              <li>description ;</li>
              <li>logo ;</li>
              <li>coordonnées renseignées par le vendeur.</li>
            </ul>

            <h3 className="mt-5 font-semibold text-[#111827]">
              Informations relatives aux commandes :
            </h3>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>nom du client ;</li>
              <li>adresse email ;</li>
              <li>numéro de téléphone ;</li>
              <li>adresse de livraison ;</li>
              <li>produits commandés ;</li>
              <li>date et heure souhaitées ;</li>
              <li>notes associées à la commande.</li>
            </ul>

            <h3 className="mt-5 font-semibold text-[#111827]">Informations de paiement :</h3>
            <p className="mt-3">Les paiements sont traités par Stripe.</p>
            <p className="mt-3">Boumly ne stocke jamais les numéros de carte bancaire.</p>
            <p className="mt-3">
              Les informations de paiement sont traitées directement par Stripe conformément à sa
              propre politique de confidentialité.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">3. Finalités du traitement</h2>
            <p className="mt-3">Les données sont collectées afin de :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>créer et gérer les comptes utilisateurs ;</li>
              <li>permettre la création et la gestion des boutiques ;</li>
              <li>traiter les commandes ;</li>
              <li>assurer le suivi des paiements ;</li>
              <li>fournir le support client ;</li>
              <li>améliorer la plateforme ;</li>
              <li>respecter nos obligations légales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">4. Base légale du traitement</h2>
            <p className="mt-3">Les traitements sont fondés sur :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>l’exécution du contrat entre l’utilisateur et Boumly ;</li>
              <li>le respect d’obligations légales ;</li>
              <li>
                l’intérêt légitime de Boumly pour améliorer ses services et assurer leur sécurité.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">5. Destinataires des données</h2>
            <p className="mt-3">Les données peuvent être transmises aux prestataires suivants :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>
                Firebase (Google) pour l’authentification, la base de données et l’hébergement de
                certaines données ;
              </li>
              <li>Stripe pour le traitement des paiements ;</li>
              <li>Brevo pour l’envoi d’emails ;</li>
              <li>Vercel pour l’hébergement du site.</li>
            </ul>
            <p className="mt-3">
              Ces prestataires n’utilisent les données que dans le cadre des services fournis à
              Boumly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">6. Durée de conservation</h2>
            <p className="mt-3">
              Les données sont conservées pendant la durée nécessaire à la fourniture du service.
            </p>
            <p className="mt-3">
              Les données liées aux commandes et aux obligations comptables peuvent être conservées
              conformément aux obligations légales applicables.
            </p>
            <p className="mt-3">
              En cas de suppression d’un compte, certaines données peuvent être conservées lorsque
              la loi l’impose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">7. Sécurité</h2>
            <p className="mt-3">
              Boumly met en œuvre des mesures techniques et organisationnelles raisonnables afin de
              protéger les données personnelles contre tout accès non autorisé, perte, divulgation
              ou altération.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">8. Droits des utilisateurs</h2>
            <p className="mt-3">
              Conformément au Règlement Général sur la Protection des Données (RGPD), chaque
              utilisateur dispose des droits suivants :
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>droit d’accès ;</li>
              <li>droit de rectification ;</li>
              <li>droit d’effacement ;</li>
              <li>droit à la limitation du traitement ;</li>
              <li>droit d’opposition ;</li>
              <li>droit à la portabilité des données.</li>
            </ul>
            <p className="mt-3">Toute demande peut être adressée à :</p>
            <p className="mt-3">
              <a href="mailto:contact@boumly.com" className="text-[#FF4D6D] hover:underline">
                contact@boumly.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">9. Réclamation</h2>
            <p className="mt-3">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
              réclamation auprès de la Commission Nationale de l’Informatique et des Libertés
              (CNIL) :
            </p>
            <p className="mt-3">
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF4D6D] hover:underline"
              >
                https://www.cnil.fr
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">10. Modification de la politique</h2>
            <p className="mt-3">
              Boumly se réserve le droit de modifier la présente politique de confidentialité à
              tout moment.
            </p>
            <p className="mt-3">La version la plus récente est toujours accessible sur le site.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
