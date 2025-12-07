import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RecipeList, ViewProvider } from "@/components/recipes/recipe-list";
import { Heart } from "lucide-react";
import Link from "next/link";
import type { CostEstimate, Category } from "@/types/recipe";

export const metadata: Metadata = {
  title: "Mes favoris | Yumiso",
  description: "Vos recettes favorites",
};

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      favorites: {
        include: {
          ingredients: true,
          steps: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  const favorites = user?.favorites || [];

  // Transform favorites to match Recipe type
  const recipesWithCostEstimate = favorites.map(fav => ({
    ...fav,
    category: fav.category as Category,
    costEstimate: fav.costEstimate as CostEstimate,
  }));

  // Create a Set of favorite IDs (all recipes on this page are favorites)
  const favoriteIds = new Set(favorites.map(fav => fav.id));

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      {/* Content */}
      <section className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Page Title Card */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 shadow-md">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">Mes favoris</h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              {favorites.length} recette{favorites.length !== 1 ? "s" : ""} sauvegardée{favorites.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700">
            <Heart className="h-16 w-16 mx-auto text-stone-300 dark:text-stone-600 mb-4" />
            <h2 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">
              Aucun favori pour le moment
            </h2>
            <p className="text-stone-500 dark:text-stone-400 mb-6">
              Parcourez les recettes et ajoutez-les à vos favoris !
            </p>
            <Link href="/recipes">
              <button className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg cursor-pointer">
                Découvrir les recettes
              </button>
            </Link>
          </div>
        ) : (
          <ViewProvider>
            <RecipeList recipes={recipesWithCostEstimate} favoriteIds={favoriteIds} />
          </ViewProvider>
        )}
      </section>
    </main>
  );
}

