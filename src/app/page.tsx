import Link from "next/link";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ChefHat, Calendar, ShoppingCart, Users, Sparkles, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Yumiso - Organisez vos repas, simplifiez votre quotidien",
  description: "Découvrez des recettes délicieuses, planifiez vos menus de la semaine et générez automatiquement vos listes de courses. Votre assistant culinaire intelligent et gratuit.",
  keywords: ["recettes", "meal planner", "liste de courses", "cuisine", "menu semaine", "planification repas"],
  openGraph: {
    title: "Yumiso - Organisez vos repas, simplifiez votre quotidien",
    description: "Découvrez des recettes délicieuses, planifiez vos menus de la semaine et générez automatiquement vos listes de courses.",
    url: "https://yumiso.fr",
    siteName: "Yumiso",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yumiso - Organisez vos repas, simplifiez votre quotidien",
    description: "Découvrez des recettes délicieuses, planifiez vos menus de la semaine et générez automatiquement vos listes de courses.",
  },
  alternates: {
    canonical: "https://yumiso.fr",
  },
};

export default async function Home() {
  // Récupérer quelques stats pour la page d'accueil
  const [recipeCount, userCount] = await Promise.all([
    db.recipe.count({ where: { status: "PUBLIC", deletedAt: null } }),
    db.user.count({ where: { deletedAt: null } }),
  ]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5" />
        <div className="container mx-auto px-4 py-16 sm:py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Votre assistant culinaire intelligent
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 dark:text-white mb-6 leading-tight">
              Organisez vos repas,
              <span className="text-emerald-600 dark:text-emerald-400"> simplifiez votre quotidien</span>
            </h1>

            <p className="text-lg sm:text-xl text-stone-600 dark:text-stone-300 mb-8 max-w-2xl mx-auto">
              Découvrez des recettes délicieuses, planifiez vos menus de la semaine et générez automatiquement vos listes de courses.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-lg px-8">
                <Link href="/recipes">
                  Découvrir les recettes
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2 text-lg px-8">
                <Link href="/auth/signin">
                  Se connecter
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 sm:gap-12 mt-12 pt-8 border-t border-stone-200 dark:border-stone-700">
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{recipeCount}+</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">Recettes</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{userCount}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">Utilisateurs</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">100%</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">Gratuit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-white dark:bg-stone-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-white mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-stone-600 dark:text-stone-300 max-w-2xl mx-auto">
              Des outils puissants pour organiser votre cuisine au quotidien
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <Link href="/recipes" className="group p-6 rounded-2xl bg-stone-50 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all border border-stone-100 dark:border-stone-700 hover:border-emerald-200 dark:hover:border-emerald-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ChefHat className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">Recettes</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Parcourez notre collection de recettes ou importez les vôtres depuis YouTube et TikTok.
              </p>
            </Link>

            {/* Feature 2 */}
            <Link href="/meal-planner" className="group p-6 rounded-2xl bg-stone-50 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all border border-stone-100 dark:border-stone-700 hover:border-amber-200 dark:hover:border-amber-800">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">Meal Planner</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Planifiez vos repas pour la semaine et générez des menus équilibrés automatiquement.
              </p>
            </Link>

            {/* Feature 3 */}
            <Link href="/shopping-lists" className="group p-6 rounded-2xl bg-stone-50 dark:bg-stone-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-stone-100 dark:border-stone-700 hover:border-blue-200 dark:hover:border-blue-800">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">Listes de courses</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Générez automatiquement vos listes de courses et partagez-les en temps réel.
              </p>
            </Link>

            {/* Feature 4 */}
            <div className="group p-6 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">Collaboratif</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Partagez vos plannings et listes de courses avec votre famille en temps réel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Prêt à simplifier votre cuisine ?
          </h2>
          <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
            Rejoignez Yumiso gratuitement et commencez à organiser vos repas dès aujourd&apos;hui.
          </p>
          <Button asChild size="lg" variant="secondary" className="gap-2 text-lg px-8">
            <Link href="/recipes">
              Commencer maintenant
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-stone-100 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-emerald-600" />
              <span className="font-bold text-stone-900 dark:text-white">Yumiso</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-stone-600 dark:text-stone-400">
              <Link href="/privacy" className="hover:text-emerald-600 transition-colors">Confidentialité</Link>
              <Link href="/terms" className="hover:text-emerald-600 transition-colors">CGU</Link>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              © {new Date().getFullYear()} Yumiso. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
