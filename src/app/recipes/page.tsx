import { Suspense } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { RecipeList } from "@/components/recipes/recipe-list";
import { RecipeListSkeleton } from "@/components/recipes/recipe-skeleton";
import { RecipeFilters } from "@/components/recipes/recipe-filters";
import { AdvancedFilters } from "@/components/recipes/advanced-filters";
import { QuickFilters } from "@/components/recipes/quick-filters";
import { HeaderActions } from "@/components/recipes/header-actions";
import type { Recipe } from "@/types/recipe";
import { ChefHat } from "lucide-react";

interface SearchParams {
  category?: string;
  search?: string;
  sort?: string;
  maxTime?: string;
  dietary?: string;
}

// Category sort order (priority)
const categoryOrder: Record<string, number> = {
  MAIN_DISH: 1,
  STARTER: 2,
  DESSERT: 3,
  SIDE_DISH: 4,
  SOUP: 5,
  SALAD: 6,
  BEVERAGE: 7,
  SNACK: 8,
};

async function getRecipes(searchParams: SearchParams): Promise<Recipe[]> {
  const { category, search, maxTime, dietary } = searchParams;

  // Parse dietary tags
  const dietaryTags = dietary ? dietary.split(",") : [];

  const recipes = await db.recipe.findMany({
    where: {
      AND: [
        category ? { category } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { author: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        // Filter by max time (prep + cooking)
        maxTime
          ? {
              OR: [
                {
                  AND: [
                    { preparationTime: { lte: parseInt(maxTime) } },
                    { cookingTime: { equals: 0 } },
                  ],
                },
                {
                  AND: [
                    { preparationTime: { equals: 0 } },
                    { cookingTime: { lte: parseInt(maxTime) } },
                  ],
                },
                // Simple approach: just check if either is less than maxTime
              ],
            }
          : {},
        // Filter by dietary tags
        ...(dietaryTags.length > 0
          ? dietaryTags.map((tag) => ({ dietaryTags: { has: tag } }))
          : []),
      ],
    },
    include: {
      ingredients: true,
      steps: { orderBy: { order: "asc" } },
    },
  });

  return recipes as Recipe[];
}

async function getFavoriteIds(userId?: string): Promise<Set<number>> {
  if (!userId) return new Set();
  
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { favorites: { select: { id: true } } },
  });
  
  return new Set(user?.favorites.map(f => f.id) || []);
}

function sortRecipes(recipes: Recipe[], favoriteIds: Set<number>, sortOption?: string): Recipe[] {
  return recipes.sort((a, b) => {
    // First: favorites come first (unless specific sort is chosen)
    if (!sortOption || sortOption === "default") {
      const aIsFav = favoriteIds.has(a.id);
      const bIsFav = favoriteIds.has(b.id);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
    }

    // Apply specific sorting
    switch (sortOption) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "rating":
        return b.rating - a.rating;
      case "time_asc":
        return (a.preparationTime + a.cookingTime) - (b.preparationTime + b.cookingTime);
      case "time_desc":
        return (b.preparationTime + b.cookingTime) - (a.preparationTime + a.cookingTime);
      case "name_asc":
        return a.name.localeCompare(b.name, "fr");
      case "name_desc":
        return b.name.localeCompare(a.name, "fr");
      default:
        // Default sorting: by category, then rating, then name
        const catOrderA = categoryOrder[a.category] || 99;
        const catOrderB = categoryOrder[b.category] || 99;
        if (catOrderA !== catOrderB) return catOrderA - catOrderB;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.name.localeCompare(b.name, "fr");
    }
  });
}

async function RecipesContent({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const [recipes, favoriteIds] = await Promise.all([
    getRecipes(searchParams),
    getFavoriteIds(session?.user?.id),
  ]);
  
  const sortedRecipes = sortRecipes(recipes, favoriteIds, searchParams.sort);
  
  return <RecipeList recipes={sortedRecipes} favoriteIds={favoriteIds} />;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen">
      {/* Header - compact on mobile */}
      <header className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />

        <div className="relative mx-auto max-w-screen-2xl px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div>
                <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-white">
                  Gourmiso
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-white/80 hidden sm:block">
                  Les recettes de MISO
                </p>
              </div>
            </div>

            <HeaderActions />
          </div>
        </div>
      </header>

      {/* Content - less padding on mobile */}
      <section className="mx-auto max-w-screen-2xl px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
        {/* Quick Category Filters - hidden on mobile */}
        <QuickFilters currentCategory={params.category} />

        {/* Search & Category Dropdown */}
        <RecipeFilters
          currentCategory={params.category}
          currentSearch={params.search}
        />

        {/* Advanced Filters - hidden on mobile */}
        <AdvancedFilters
          currentSort={params.sort}
          currentMaxTime={params.maxTime}
        />

        <Suspense fallback={<RecipeListSkeleton />}>
          <RecipesContent searchParams={params} />
        </Suspense>
      </section>
    </main>
  );
}
