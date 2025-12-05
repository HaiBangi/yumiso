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
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Content */}
      <ViewProvider>
        <section className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
          {recipes.length === 0 ? (
            <div className="text-center py-16">
              <ChefHat className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Aucune recette pour le moment
              </h2>
              <p className="text-gray-500 mb-6">
                Commencez à créer vos propres recettes !
              </p>
              <RecipeForm
                trigger={
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
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

