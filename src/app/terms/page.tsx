import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Conditions d'utilisation - Yumiso",
  description: "Conditions générales d'utilisation de Yumiso",
  alternates: {
    canonical: "https://yumiso.fr/terms",
  },
};

export default function TermsPage() {
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
            Conditions d'utilisation
          </h1>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                1. Acceptation des conditions
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                En accédant et en utilisant Yumiso, vous acceptez d'être lié par ces conditions d'utilisation.
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                2. Description du service
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Yumiso est une plateforme de partage et de gestion de recettes culinaires. Le service permet aux
                utilisateurs de créer, partager, sauvegarder et organiser des recettes de cuisine.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                3. Compte utilisateur
              </h2>
              <p className="text-stone-700 dark:text-stone-300 mb-2">
                Pour utiliser certaines fonctionnalités de Yumiso, vous devez créer un compte. Vous vous engagez à :
              </p>
              <ul className="list-disc list-inside text-stone-700 dark:text-stone-300 space-y-2 ml-4">
                <li>Fournir des informations exactes et à jour</li>
                <li>Maintenir la sécurité de votre mot de passe</li>
                <li>Être responsable de toute activité sur votre compte</li>
                <li>Nous informer immédiatement de toute utilisation non autorisée</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                4. Contenu utilisateur
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Vous conservez tous les droits sur le contenu que vous publiez sur Yumiso. En publiant du contenu,
                vous accordez à Yumiso une licence mondiale, non exclusive et gratuite pour utiliser, reproduire,
                modifier et afficher ce contenu dans le cadre du service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                5. Comportement interdit
              </h2>
              <p className="text-stone-700 dark:text-stone-300 mb-2">
                Vous vous engagez à ne pas :
              </p>
              <ul className="list-disc list-inside text-stone-700 dark:text-stone-300 space-y-2 ml-4">
                <li>Publier du contenu illégal, offensant ou inapproprié</li>
                <li>Violer les droits de propriété intellectuelle d'autrui</li>
                <li>Utiliser le service de manière frauduleuse ou malveillante</li>
                <li>Tenter d'accéder de manière non autorisée au système</li>
                <li>Collecter des données d'autres utilisateurs sans leur consentement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                6. Limitation de responsabilité
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Yumiso est fourni "tel quel" sans garantie d'aucune sorte. Nous ne sommes pas responsables des
                dommages directs ou indirects résultant de l'utilisation du service, y compris mais sans s'y limiter,
                les erreurs dans les recettes ou les problèmes de santé liés à la préparation des aliments.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                7. Modifications du service
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Nous nous réservons le droit de modifier, suspendre ou interrompre tout ou partie du service à tout
                moment, avec ou sans préavis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                8. Résiliation
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Nous pouvons résilier ou suspendre votre accès au service immédiatement, sans préavis ni
                responsabilité, pour toute raison, notamment si vous violez ces conditions d'utilisation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                9. Loi applicable
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Ces conditions sont régies par les lois françaises. Tout litige sera soumis aux tribunaux compétents
                de France.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
                10. Contact
              </h2>
              <p className="text-stone-700 dark:text-stone-300">
                Pour toute question concernant ces conditions d'utilisation, veuillez nous contacter à l'adresse
                email fournie sur notre page de contact.
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
