import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function MentionsLegalesPage() {
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
          Mentions légales
        </h1>

        <div className="mt-10 space-y-10 text-[#374151] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#111827]">Éditeur du site</h2>
            <p className="mt-3">Le site Boumly est édité par :</p>
            <p className="mt-3">
              <strong className="text-[#111827]">Manuel Briand EI</strong>
              <br />
              Entrepreneur individuel (micro-entreprise)
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
              <a
                href="mailto:contact@boumly.com"
                className="text-[#FF4D6D] hover:underline"
              >
                contact@boumly.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">Directeur de la publication</h2>
            <p className="mt-3">Manuel Briand</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">Hébergement</h2>
            <p className="mt-3">Le site est hébergé par Vercel Inc.</p>
            <p className="mt-3">
              <strong className="text-[#111827]">Vercel Inc.</strong>
              <br />
              440 N Barranca Ave #4133
              <br />
              Covina, CA 91723
              <br />
              États-Unis
            </p>
            <p className="mt-3">
              Site web :
              <br />
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF4D6D] hover:underline"
              >
                https://vercel.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">Propriété intellectuelle</h2>
            <p className="mt-3">
              L’ensemble des éléments présents sur le site Boumly, notamment les textes,
              graphismes, logos, icônes, images, vidéos, logiciels et bases de données, sont
              protégés par les dispositions du Code de la propriété intellectuelle.
            </p>
            <p className="mt-3">
              Toute reproduction, représentation, modification, publication ou adaptation de tout
              ou partie des éléments du site est interdite sans autorisation préalable écrite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#111827]">Responsabilité</h2>
            <p className="mt-3">
              Boumly fournit une plateforme permettant aux vendeurs de créer une boutique en
              ligne, recevoir des commandes et encaisser des paiements.
            </p>
            <p className="mt-3">
              Boumly n’est pas vendeur des produits ou services proposés sur les boutiques créées
              via la plateforme.
            </p>
            <p className="mt-3">Chaque vendeur est seul responsable :</p>
            <ul className="mt-3 list-disc pl-6 space-y-1.5">
              <li>des produits et services proposés ;</li>
              <li>des informations publiées sur sa boutique ;</li>
              <li>des prix affichés ;</li>
              <li>de l’exécution des commandes ;</li>
              <li>des remboursements et annulations ;</li>
              <li>
                du respect des obligations légales, fiscales et réglementaires applicables à son
                activité.
              </li>
            </ul>
            <p className="mt-3">
              Boumly ne pourra être tenu responsable des litiges intervenant entre un vendeur et
              ses clients.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
