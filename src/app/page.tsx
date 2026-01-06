import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ChefHat, Calendar, ShoppingCart, Users, ArrowRight, UtensilsCrossed, Pizza, Cookie, Apple, Croissant, IceCream, Coffee, Cake, Salad, Fish, Beef, Carrot, Soup, Sandwich, Egg, Cherry, Drumstick, Citrus, Milk, Wheat, Grape, CakeSlice, Banknote } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-amber-50/30 to-orange-50/20 overflow-hidden relative">
      {/* Decorative Animated Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-300/30 to-teal-300/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-amber-300/20 to-orange-300/20 rounded-full blur-3xl animate-blob-delay-2" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-gradient-to-br from-emerald-200/30 to-green-200/20 rounded-full blur-3xl animate-blob-delay-4" />
      </div>

      {/* Floating Food Icons */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {[
          // Gauche - visible sur tous les écrans
          { Icon: Pizza, top: "15%", left: "10%", delay: 0, duration: 22, rotate: -15, mobile: true },
          { Icon: Apple, top: "40%", left: "8%", delay: 1.5, duration: 24, rotate: -10, mobile: false },
          { Icon: Cake, top: "70%", left: "12%", delay: 2.5, duration: 20, rotate: -18, mobile: true },
          { Icon: Soup, top: "55%", left: "5%", delay: 3.2, duration: 23, rotate: 8, mobile: false },

          // Droite - visible sur tous les écrans
          { Icon: Cookie, top: "20%", right: "12%", delay: 1, duration: 25, rotate: 20, mobile: true },
          { Icon: IceCream, top: "50%", right: "10%", delay: 2, duration: 21, rotate: -12, mobile: false },
          { Icon: Coffee, top: "75%", right: "15%", delay: 0.5, duration: 23, rotate: 15, mobile: true },
          { Icon: Beef, top: "35%", right: "8%", delay: 2.6, duration: 24, rotate: -18, mobile: false },

          // Centre - seulement sur desktop
          { Icon: Croissant, top: "12%", left: "48%", delay: 2.8, duration: 24, rotate: 12, mobile: false },
          { Icon: Fish, top: "35%", left: "45%", delay: 1.2, duration: 22, rotate: -8, mobile: false },
          { Icon: Salad, top: "60%", left: "52%", delay: 3, duration: 25, rotate: 18, mobile: false },
          { Icon: Cherry, top: "85%", left: "42%", delay: 0.8, duration: 21, rotate: -15, mobile: true },
          { Icon: Egg, top: "48%", left: "50%", delay: 1.4, duration: 23, rotate: 15, mobile: false },

          // Supplémentaires - seulement sur desktop
          { Icon: Carrot, top: "28%", left: "25%", delay: 1.8, duration: 23, rotate: 10, mobile: false },
          { Icon: Drumstick, top: "65%", right: "30%", delay: 2.2, duration: 22, rotate: -20, mobile: false },
          { Icon: Sandwich, top: "10%", left: "30%", delay: 0.6, duration: 24, rotate: -12, mobile: false },
          { Icon: Citrus, top: "80%", left: "28%", delay: 2.4, duration: 21, rotate: 18, mobile: false },
          { Icon: Milk, top: "22%", right: "28%", delay: 1.6, duration: 25, rotate: -8, mobile: false },
          { Icon: Grape, top: "90%", right: "25%", delay: 3.4, duration: 20, rotate: 12, mobile: false },
        ].map((item, index) => (
          <div
            key={index}
            className={`absolute animate-float opacity-[0.13] hover:opacity-[0.30] transition-opacity duration-300 ${item.mobile ? '' : 'hidden sm:block'}`}
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              animationDelay: `${item.delay}s`,
              animationDuration: `${item.duration}s`,
              transform: `rotate(${item.rotate}deg)`,
            }}
          >
            <item.Icon className="h-16 w-16 text-emerald-600" strokeWidth={1.5} />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-6 py-6">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            {/* Logo */}
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-float">
                  <ChefHat className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full animate-ping" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-br from-orange-400 to-red-400 rounded-full animate-pulse" />
              </div>
              <span className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                Yumiso
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 mb-4 leading-[1.1]">
              Cuisinez malin,
              <br />
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent animate-gradient-text">
                vivez mieux
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto mb-6 leading-relaxed font-medium">
              Découvrez des recettes, planifiez vos repas et générez vos listes de courses en un clic.
            </p>

            {/* Search Bar */}
            <div className="mb-5">
              <LandingSearchBar />
            </div>

            {/* CTA */}
            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full px-8 py-5 text-lg shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105 group border-0">
              <Link href="/recipes" className="gap-3">
                Accéder aux recettes
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            {/* Stats */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 mt-6">
              <div className="text-center group cursor-default">
                <div className="relative inline-block">
                  <p className="text-3xl font-bold bg-gradient-to-br from-emerald-600 to-teal-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {recipeCount}+
                  </p>
                  <div className="absolute -inset-2 bg-emerald-500/10 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                </div>
                <p className="text-sm text-stone-500 mt-1 font-medium">recettes</p>
              </div>
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-stone-300 to-transparent" />
              <div className="text-center group cursor-default">
                <div className="relative inline-block">
                  <p className="text-3xl font-bold bg-gradient-to-br from-amber-600 to-orange-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {userCount}
                  </p>
                  <div className="absolute -inset-2 bg-amber-500/10 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                </div>
                <p className="text-sm text-stone-500 mt-1 font-medium">utilisateurs</p>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 animate-fade-in-up">
            <Link href="/recipes" className="group relative p-6 lg:p-8 rounded-3xl bg-white/80 backdrop-blur-sm border-2 border-emerald-100 hover:border-emerald-300 shadow-lg shadow-emerald-100/50 hover:shadow-xl hover:shadow-emerald-200/60 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/10 group-hover:to-teal-500/10 transition-all duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <ChefHat className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Recettes</h3>
                <p className="text-stone-500 text-sm leading-relaxed">Parcourez et importez vos recettes préférées</p>
              </div>
            </Link>

            <Link href="/meal-planner" className="group relative p-6 lg:p-8 rounded-3xl bg-white/80 backdrop-blur-sm border-2 border-amber-100 hover:border-amber-300 shadow-lg shadow-amber-100/50 hover:shadow-xl hover:shadow-amber-200/60 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/10 group-hover:to-orange-500/10 transition-all duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <Calendar className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Meal Planner</h3>
                <p className="text-stone-500 text-sm leading-relaxed">Planifiez vos repas de la semaine facilement</p>
              </div>
            </Link>

            <Link href="/shopping-lists" className="group relative p-6 lg:p-8 rounded-3xl bg-white/80 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-300 shadow-lg shadow-blue-100/50 hover:shadow-xl hover:shadow-blue-200/60 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 transition-all duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <ShoppingCart className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Courses</h3>
                <p className="text-stone-500 text-sm leading-relaxed">Listes générées automatiquement pour vous</p>
              </div>
            </Link>

            <div className="group relative p-6 lg:p-8 rounded-3xl bg-white/80 backdrop-blur-sm border-2 border-purple-100 hover:border-purple-300 shadow-lg shadow-purple-100/50 hover:shadow-xl hover:shadow-purple-200/60 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
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
      <footer className="py-6 text-center border-t border-stone-200/50 bg-white/30 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-6 text-sm text-stone-500">
          <span>© 2026 Yumiso</span>
          <Link href="/privacy" className="hover:text-emerald-600 transition-colors">Confidentialité</Link>
          <Link href="/terms" className="hover:text-emerald-600 transition-colors">CGU</Link>
        </div>
      </footer>
    </div>
  );
}
