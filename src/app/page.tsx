import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ChefHat, Calendar, ShoppingCart, Users, ArrowRight, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { LandingSearchBar } from "@/components/landing/landing-search-bar";

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
  const session = await auth();
  if (session?.user) {
    redirect("/recipes");
  }

  const [recipeCount, userCount] = await Promise.all([
    db.recipe.count({ where: { status: "PUBLIC", deletedAt: null } }),
    db.user.count({ where: { deletedAt: null } }),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-white to-amber-50/20 overflow-hidden">
      {/* Decorative Animated Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/40 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl animate-blob-delay-2" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-emerald-100/50 rounded-full blur-3xl animate-blob-delay-4" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            {/* Logo */}
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-float">
                  <ChefHat className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-stone-800 via-stone-700 to-stone-600 bg-clip-text text-transparent">
                Yumiso
              </span>
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-stone-900 mb-6">
              Cuisinez malin,
              <br />
              <span className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 bg-clip-text text-transparent animate-gradient-text">
                vivez mieux
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-stone-500 max-w-2xl mx-auto mb-8 leading-relaxed">
              Découvrez des recettes, planifiez vos repas et générez vos listes de courses en un clic.
            </p>

            {/* Search Bar */}
            <div className="mb-8">
              <LandingSearchBar />
            </div>

            {/* CTA */}
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
              <Link href="/recipes" className="gap-3">
                Accéder aux recettes
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mt-10">
              <div className="text-center">
                <p className="text-3xl font-bold text-stone-800">{recipeCount}+</p>
                <p className="text-sm text-stone-400">recettes</p>
              </div>
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-stone-200 to-transparent" />
              <div className="text-center">
                <p className="text-3xl font-bold text-stone-800">{userCount}</p>
                <p className="text-sm text-stone-400">utilisateurs</p>
              </div>
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-stone-200 to-transparent" />
              <div className="text-center flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <p className="text-3xl font-bold text-stone-800">100%</p>
                </div>
                <p className="text-sm text-stone-400">gratuit</p>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 animate-fade-in-up">
            <Link href="/recipes" className="group relative p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg shadow-stone-200/50 hover:shadow-xl hover:shadow-emerald-200/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <ChefHat className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Recettes</h3>
                <p className="text-stone-500 text-sm leading-relaxed">Parcourez et importez vos recettes préférées</p>
              </div>
            </Link>

            <Link href="/meal-planner" className="group relative p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg shadow-stone-200/50 hover:shadow-xl hover:shadow-amber-200/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Meal Planner</h3>
                <p className="text-stone-500 text-sm leading-relaxed">Planifiez vos repas de la semaine facilement</p>
              </div>
            </Link>

            <Link href="/shopping-lists" className="group relative p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg shadow-stone-200/50 hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-blue-500/10 transition-all duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingCart className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Courses</h3>
                <p className="text-stone-500 text-sm leading-relaxed">Listes générées automatiquement pour vous</p>
              </div>
            </Link>

            <div className="group relative p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg shadow-stone-200/50 hover:shadow-xl hover:shadow-purple-200/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-purple-500/10 transition-all duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-7 w-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Collaboratif</h3>
                <p className="text-stone-500 text-sm leading-relaxed">Partagez avec votre famille en temps réel</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-stone-400">
          <span>© 2026 Yumiso</span>
          <Link href="/privacy" className="hover:text-emerald-600 transition-colors">Confidentialité</Link>
          <Link href="/terms" className="hover:text-emerald-600 transition-colors">CGU</Link>
        </div>
      </footer>
    </div>
  );
}
