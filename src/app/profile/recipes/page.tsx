import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AutoOpenRecipeForm } from "@/components/recipes/auto-open-recipe-form";
import { Button } from "@/components/ui/button";
import { ChefHat, Plus } from "lucide-react";
import type { Recipe } from "@/types/recipe";
import { MyRecipesContent } from "@/components/recipes/my-recipes-content";

export const metadata: Metadata = {
  title: "Mes recettes | Yumiso",
  description: "Gérez vos recettes personnelles",
};

export default async function MyRecipesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const recipes = await db.recipe.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null, // Exclure les recettes soft-deleted
    },
    include: {
      ingredients: {
        orderBy: { order: "asc" },
      },
      ingredientGroups: {
        include: {
          ingredients: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      steps: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <MyRecipesContent recipes={recipes as Recipe[]} />
      </div>
    </main>
  );
}
