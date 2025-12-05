import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RecipeDetail } from "@/components/recipes/recipe-detail";
import type { Recipe } from "@/types/recipe";
import type { Metadata } from "next";

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

async function getRecipe(id: number): Promise<Recipe | null> {
  const recipe = await db.recipe.findUnique({
    where: { id },
    include: {
      ingredients: true,
      steps: { orderBy: { order: "asc" } },
    },
  });

  return recipe as Recipe | null;
}

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipeId = parseInt(id, 10);
  
  if (isNaN(recipeId)) {
    return { title: "Recette non trouvée | Gourmich" };
  }

  const recipe = await getRecipe(recipeId);
  
  if (!recipe) {
    return { title: "Recette non trouvée | Gourmich" };
  }

  return {
    title: `${recipe.name} | Gourmich`,
    description: recipe.description || `Découvrez la recette ${recipe.name} par ${recipe.author}`,
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);

  if (isNaN(recipeId)) {
    notFound();
  }

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    notFound();
  }

  return <RecipeDetail recipe={recipe} />;
}

