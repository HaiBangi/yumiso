import { Suspense } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ViewProvider, RecipeViewToggle } from "@/components/recipes/recipe-list";
import {
  RecipeListWithDeletion,
  DeletionModeProvider,
  DeletionModeToggleButton
} from "@/components/recipes/recipe-list-with-deletion";
import { RecipeListSkeleton } from "@/components/recipes/recipe-skeleton";
import { MobileFiltersSheet } from "@/components/recipes/mobile-filters-sheet";
import { DesktopFiltersSheet } from "@/components/recipes/desktop-filters-sheet";
import { MobileSearchBar } from "@/components/recipes/mobile-search-bar";
import { DesktopSearchBar } from "@/components/recipes/desktop-search-bar";
import { PseudoBanner } from "@/components/auth/pseudo-banner";
import type { Recipe } from "@/types/recipe";

interface SearchParams {
  category?: string;
  search?: string;
  sort?: string;
  maxTime?: string;
  authors?: string;
  myRecipes?: string;
  tags?: string;
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
  const { category, search, maxTime, authors, myRecipes, tags } = searchParams;

  // Parse filters
  const authorIds = authors ? authors.split(",").filter(Boolean) : [];
  const filterMyRecipes = myRecipes === "true" && userId;
  const categories = category ? category.split(",").filter(Boolean) : [];
  const filterTags = tags ? tags.split(",").map(t => t.toLowerCase()).filter(Boolean) : [];

  // If we have tags to filter, we need to get all recipes and filter manually
  // because Prisma doesn't support case-insensitive array matching
  let recipes = await db.recipe.findMany({
    where: {
      AND: [
        // Multiple categories
        categories.length > 0 ? { category: { in: categories } } : {},
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
        // Note: We'll filter tags manually below for case-insensitive matching
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
      steps: { orderBy: { order: "asc" } },
    },
  });

  // Manual case-insensitive tag filtering
  if (filterTags.length > 0) {
    recipes = recipes.filter(recipe => {
      const recipeTags = recipe.tags.map(t => t.toLowerCase());
      return filterTags.some(filterTag => recipeTags.includes(filterTag));
    });
  }

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

async function getPopularTags(limit: number = 15): Promise<Array<{ value: string; label: string; count: number }>> {
  // Get all recipes with their tags
  const recipes = await db.recipe.findMany({
    select: { tags: true },
  });

  // Count tag occurrences (case-insensitive)
  const tagCounts = new Map<string, number>();
  recipes.forEach(recipe => {
    recipe.tags.forEach(tag => {
      const lowerTag = tag.toLowerCase();
      tagCounts.set(lowerTag, (tagCounts.get(lowerTag) || 0) + 1);
    });
  });

  // Sort by count and take top N
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({
      value: tag.toLowerCase(),
      label: tag.charAt(0).toUpperCase() + tag.slice(1), // Capitalize first letter
      count,
    }));
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
      case "recent":
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "rating":
        return b.rating - a.rating;
      case "quick":
      case "time_asc":
        return (a.preparationTime + a.cookingTime) - (b.preparationTime + b.cookingTime);
      case "time_desc":
        return (b.preparationTime + b.cookingTime) - (a.preparationTime + a.cookingTime);
      case "favorites":
        const aIsFav = favoriteIds.has(a.id);
        const bIsFav = favoriteIds.has(b.id);
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return b.rating - a.rating; // Secondary sort by rating
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

  // Get popular tags for filters
  const popularTags = await getPopularTags(15);

  return (
    <main className="min-h-screen">
      {/* Pseudo CTA Banner */}
      {showPseudoBanner && (
        <PseudoBanner userId={userId} userName={userName} />
      )}

      {/* Content - less padding on mobile */}
      <ViewProvider>
        <DeletionModeProvider isAdmin={isAdmin}>
          <section className="mx-auto max-w-screen-2xl px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
            {/* Mobile-only interface */}
            <div className="block sm:hidden space-y-3 mb-4">
              {/* Search bar mobile */}
              <MobileSearchBar currentSearch={params.search} />

              {/* Filters & Sort button mobile */}
              <MobileFiltersSheet
                currentCategory={params.category}
                currentSort={params.sort}
                currentMaxTime={params.maxTime}
                currentTags={params.tags ? params.tags.split(",") : []}
                availableTags={popularTags}
              />
            </div>

            {/* Desktop interface - redesigned */}
            <div className="hidden sm:block mb-6">
              <div className="flex gap-3">
                {/* Search bar */}
                <DesktopSearchBar currentSearch={params.search} />

                {/* Filters & Sort Sheet */}
                <DesktopFiltersSheet
                  currentCategory={params.category}
                  currentSort={params.sort}
                  currentMaxTime={params.maxTime}
                  currentTags={params.tags ? params.tags.split(",") : []}
                  availableTags={popularTags}
                />

                {/* View Toggle */}
                <RecipeViewToggle />

                {/* Deletion Mode Toggle (admin only) */}
                {isAdmin && <DeletionModeToggleButton isAdmin={isAdmin} />}
              </div>
            </div>

            <Suspense fallback={<RecipeListSkeleton />}>
              <RecipesContent searchParams={params} userId={userId} isAdmin={isAdmin} />
            </Suspense>
          </section>
        </DeletionModeProvider>
      </ViewProvider>
    </main>
  );
}
