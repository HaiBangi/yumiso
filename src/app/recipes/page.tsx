import { Suspense } from "react";
import { db } from "@/lib/db";
import { RecipeList } from "@/components/recipes/recipe-list";
import { RecipeListSkeleton } from "@/components/recipes/recipe-skeleton";
import { RecipeFilters } from "@/components/recipes/recipe-filters";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/types/recipe";
import { ChefHat, Plus } from "lucide-react";

interface SearchParams {
  category?: string;
  search?: string;
}

async function getRecipes(searchParams: SearchParams): Promise<Recipe[]> {
  const { category, search } = searchParams;

  const recipes = await db.recipe.findMany({
    where: {
      AND: [
        category ? { category } : {},
        search
          ? {
              OR: [
                { name: { contains: search } },
                { description: { contains: search } },
                { author: { contains: search } },
              ],
            }
          : {},
      ],
    },
    include: {
      ingredients: true,
      steps: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return recipes as Recipe[];
}

async function RecipesContent({ searchParams }: { searchParams: SearchParams }) {
  const recipes = await getRecipes(searchParams);
  return <RecipeList recipes={recipes} />;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen">
      {/* Compact Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />

        <div className="relative mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-white">
                  Gourmiso
                </h1>
                <p className="text-sm text-white/80 hidden sm:block">
                  Les recettes de MISO
                </p>
              </div>
            </div>

            <RecipeForm
              trigger={
                <Button
                  size="sm"
                  className="bg-white text-amber-600 hover:bg-white/90 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nouvelle recette</span>
                  <span className="sm:hidden">Ajouter</span>
                </Button>
              }
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <RecipeFilters
          currentCategory={params.category}
          currentSearch={params.search}
        />

        <Suspense fallback={<RecipeListSkeleton />}>
          <RecipesContent searchParams={params} />
        </Suspense>
      </section>
    </main>
  );
}
