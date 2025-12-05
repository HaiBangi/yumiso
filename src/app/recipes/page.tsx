import { Suspense } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ViewProvider, RecipeViewToggle } from "@/components/recipes/recipe-list";
import { RecipeListWithDeletion } from "@/components/recipes/recipe-list-with-deletion";
import { RecipeListSkeleton } from "@/components/recipes/recipe-skeleton";
import { RecipeFilters } from "@/components/recipes/recipe-filters";
import { AdvancedFilters } from "@/components/recipes/advanced-filters";
import { QuickFilters } from "@/components/recipes/quick-filters";
import { PseudoBanner } from "@/components/auth/pseudo-banner";
import type { Recipe } from "@/types/recipe";

interface SearchParams {
  category?: string;
  search?: string;
  sort?: string;
  maxTime?: string;
  authors?: string;
  myRecipes?: string;
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

async function getRecipes(searchParams: SearchParams, userId?: string): Promise<Recipe[]> {
  const { category, search, maxTime, authors, myRecipes } = searchParams;

  // Parse author filter
  const authorIds = authors ? authors.split(",").filter(Boolean) : [];
  const filterMyRecipes = myRecipes === "true" && userId;

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
                { tags: { hasSome: [search.toLowerCase()] } },
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
              ],
            }
          : {},
        // Filter by my recipes
        filterMyRecipes ? { userId } : {},
        // Filter by selected authors
        authorIds.length > 0
          ? {
              OR: [
                { userId: { in: authorIds } },
                { author: { in: authorIds } },
              ],
            }
          : {},
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

async function RecipesContent({ searchParams, userId, isAdmin }: { searchParams: SearchParams; userId?: string; isAdmin: boolean }) {
  const [recipes, favoriteIds] = await Promise.all([
    getRecipes(searchParams, userId),
    getFavoriteIds(userId),
  ]);

  const sortedRecipes = sortRecipes(recipes, favoriteIds, searchParams.sort);

  return <RecipeListWithDeletion recipes={sortedRecipes} favoriteIds={favoriteIds} isAdmin={isAdmin} />;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";

  // Get user's pseudo if logged in
  let userPseudo: string | null = null;
  let userName: string | null = null;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { pseudo: true, name: true },
    });
    userPseudo = user?.pseudo || null;
    userName = user?.name || null;
  }

  // Show banner if user is logged in but has no pseudo or default "Anonyme"
  const showPseudoBanner = userId && (!userPseudo || userPseudo === "Anonyme");

  // Parse selected authors from URL
  const selectedAuthors = params.myRecipes === "true"
    ? ["mine"]
    : params.authors
      ? params.authors.split(",").filter(Boolean)
      : [];

  return (
    <main className="min-h-screen">
      {/* Pseudo CTA Banner */}
      {showPseudoBanner && (
        <PseudoBanner userId={userId} userName={userName} />
      )}

      {/* Content - less padding on mobile */}
      <ViewProvider>
        <section className="mx-auto max-w-screen-2xl px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
          {/* Quick Category Filters - hidden on mobile */}
          <QuickFilters currentCategory={params.category} />

          {/* Search & Category Dropdown */}
          <RecipeFilters
            currentCategory={params.category}
            currentSearch={params.search}
            currentUserId={userId}
            selectedAuthors={selectedAuthors}
          />

          {/* Advanced Filters with View Toggle - hidden on mobile */}
          <AdvancedFilters
            currentSort={params.sort}
            currentMaxTime={params.maxTime}
            viewToggle={<RecipeViewToggle />}
          />

          <Suspense fallback={<RecipeListSkeleton />}>
            <RecipesContent searchParams={params} userId={userId} isAdmin={isAdmin} />
          </Suspense>
        </section>
      </ViewProvider>
    </main>
  );
}
