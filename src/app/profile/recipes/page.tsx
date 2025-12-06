import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RecipeList, ViewProvider } from "@/components/recipes/recipe-list";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { Button } from "@/components/ui/button";
import { ChefHat, Plus } from "lucide-react";
import type { Recipe } from "@/types/recipe";

export const metadata: Metadata = {
  title: "Mes recettes | Gourmiso",
  description: "Gérez vos recettes personnelles",
};

export default async function MyRecipesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const recipes = await db.recipe.findMany({
    where: { userId: session.user.id },
    include: {
      ingredients: true,
      steps: { orderBy: { order: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      {/* Content */}
      <ViewProvider>
        <section className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Page Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-700 to-green-600 shadow-md">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">Mes recettes</h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm">
                {recipes.length} recette{recipes.length !== 1 ? "s" : ""} créée{recipes.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {recipes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700">
              <ChefHat className="h-16 w-16 mx-auto text-stone-300 dark:text-stone-600 mb-4" />
              <h2 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">
                Aucune recette pour le moment
              </h2>
              <p className="text-stone-500 dark:text-stone-400 mb-6">
                Commencez à créer vos propres recettes !
              </p>
              <RecipeForm
                trigger={
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white gap-2 cursor-pointer">
                    <Plus className="h-4 w-4" />
                    Créer ma première recette
                  </Button>
                }
              />
            </div>
          ) : (
            <RecipeList recipes={recipes as Recipe[]} />
          )}
        </section>
      </ViewProvider>
    </main>
  );
}

