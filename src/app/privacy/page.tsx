import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Yumiso",
  description: "Politique de confidentialité et protection des données de Yumiso",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white dark:from-stone-950 dark:to-stone-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Button>
        </Link>

        <div className="bg-white dark:bg-stone-800 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-stone-900 dark:text-stone-100 mb-8">
            Politique de confidentialité
          </h1>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                1. Introduction
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Cette politique de confidentialité décrit comment Yumiso collecte, utilise et protège vos données
                personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                2. Données collectées
              </h2>
              <p className="text-stone-700 dark:text-stone-300 mb-2">
                Nous collectons les données suivantes :
              </p>
              <ul className="list-disc list-inside text-stone-700 dark:text-stone-300 space-y-2 ml-4">
                <li>Informations de compte : email, pseudo, photo de profil</li>
                <li>Contenu créé : recettes, commentaires, notes</li>
                <li>Données d'utilisation : pages visitées, fonctionnalités utilisées</li>
                <li>Données techniques : adresse IP, type de navigateur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                3. Utilisation des données
              </h2>
              <p className="text-stone-700 dark:text-stone-300 mb-2">
                Vos données sont utilisées pour :
              </p>
              <ul className="list-disc list-inside text-stone-700 dark:text-stone-300 space-y-2 ml-4">
                <li>Fournir et améliorer nos services</li>
                <li>Personnaliser votre expérience</li>
                <li>Communiquer avec vous concernant votre compte</li>
                <li>Analyser l'utilisation du service</li>
                <li>Détecter et prévenir la fraude ou les abus</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                4. Partage des données
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Nous ne vendons pas vos données personnelles. Vos données peuvent être partagées avec :
              </p>
              <ul className="list-disc list-inside text-stone-700 dark:text-stone-300 space-y-2 ml-4">
                <li>Les autres utilisateurs (contenu public que vous choisissez de partager)</li>
                <li>Les prestataires de services nécessaires au fonctionnement du site</li>
                <li>Les autorités légales si requis par la loi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                5. Vos droits
              </h2>
              <p className="text-stone-700 dark:text-stone-300 mb-2">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc list-inside text-stone-700 dark:text-stone-300 space-y-2 ml-4">
                <li>Droit d'accès à vos données</li>
                <li>Droit de rectification</li>
                <li>Droit à l'effacement ("droit à l'oubli")</li>
                <li>Droit à la limitation du traitement</li>
                <li>Droit à la portabilité</li>
                <li>Droit d'opposition</li>
              </ul>
              <p className="text-stone-700 dark:text-stone-300 mt-2">
                Pour exercer ces droits, contactez-nous via la page de contact.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                6. Sécurité des données
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos
                données contre la perte, l'utilisation abusive, l'accès non autorisé, la divulgation, l'altération
                ou la destruction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                7. Cookies
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Nous utilisons des cookies essentiels pour le fonctionnement du site (authentification, préférences).
                Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités
                pourraient ne plus être disponibles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                8. Conservation des données
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Nous conservons vos données aussi longtemps que votre compte est actif ou que nécessaire pour fournir
                nos services. Vous pouvez demander la suppression de votre compte à tout moment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                9. Modifications
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Nous pouvons mettre à jour cette politique de confidentialité. Les modifications importantes seront
                notifiées par email ou via une notification sur le site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                10. Contact
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Pour toute question concernant cette politique de confidentialité ou vos données personnelles,
                contactez-nous via la page de contact.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-700">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Dernière mise à jour : 2 janvier 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
