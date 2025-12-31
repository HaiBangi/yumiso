import { Suspense } from "react";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { RecipeStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { normalizeString } from "@/lib/utils";
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
import { RecipePagination } from "@/components/recipes/recipe-pagination";
import type { Recipe } from "@/types/recipe";

interface SearchParams {
  category?: string;
  search?: string;
  sort?: string;
  maxTime?: string;
  authors?: string;
  myRecipes?: string;
  tags?: string;
  collection?: string;
  page?: string;
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

const RECIPES_PER_PAGE = 20;

async function getRecipes(searchParams: SearchParams, userId?: string): Promise<{ recipes: Recipe[]; totalCount: number }> {
  const { category, search, maxTime, authors, myRecipes, tags, collection } = searchParams;

  // Parse filters
  const authorNames = authors ? authors.split(",").filter(Boolean) : [];
  const filterMyRecipes = myRecipes === "true" && userId;
  const categories = category ? category.split(",").filter(Boolean) : [];
  const filterTags = tags ? tags.split(",").map(t => t.toLowerCase()).filter(Boolean) : [];
  const collectionIds = collection ? collection.split(",").map(id => parseInt(id)).filter(id => !isNaN(id)) : [];

  // Normaliser le terme de recherche pour ignorer les accents
  const normalizedSearch = search ? normalizeString(search) : null;

  // Récupérer toutes les recettes (on filtre manuellement la recherche pour supporter les accents)
  let recipes = await db.recipe.findMany({
    where: {
      deletedAt: null, // Exclure les recettes soft-deleted
      // Filtrage par status : PUBLIC visible par tous, DRAFT/PRIVATE uniquement par l'auteur
      OR: [
        { status: RecipeStatus.PUBLIC },
        // L'auteur peut voir ses propres recettes quel que soit le status
        ...(userId ? [{ userId, status: { in: [RecipeStatus.DRAFT, RecipeStatus.PRIVATE] } }] : []),
      ],
      AND: [
        // Multiple categories
        categories.length > 0 ? { category: { in: categories } } : {},
        // Filter by collections (multiple) - une recette doit être dans au moins une des collections sélectionnées
        collectionIds.length > 0 ? {
          collections: {
            some: {
              id: { in: collectionIds }
            }
          }
        } : {},
        // Note: Recherche filtrée manuellement après pour supporter les accents
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
        // Filter by selected authors (use author name, not userId)
        authorNames.length > 0
          ? {
              author: { in: authorNames },
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
      recipeTags: {
        include: {
          tag: true,
        },
      },
    },
  });

  // Filtrage manuel avec normalisation pour ignorer les accents
  if (normalizedSearch) {
    recipes = recipes.filter(recipe => {
      const normalizedName = normalizeString(recipe.name || "");
      const normalizedDescription = normalizeString(recipe.description || "");
      const normalizedAuthor = normalizeString(recipe.author || "");
      // Utiliser recipeTags
      const normalizedTags = recipe.recipeTags && recipe.recipeTags.length > 0
        ? recipe.recipeTags.map((rt: any) => normalizeString(rt.tag.name))
        : [];

      return (
        normalizedName.includes(normalizedSearch) ||
        normalizedDescription.includes(normalizedSearch) ||
        normalizedAuthor.includes(normalizedSearch) ||
        normalizedTags.some((tag: string) => tag.includes(normalizedSearch))
      );
    });
  }

  // Manual case-insensitive tag filtering - utiliser recipeTags
  if (filterTags.length > 0) {
    recipes = recipes.filter(recipe => {
      // Utiliser recipeTags
      const recipeTags = recipe.recipeTags && recipe.recipeTags.length > 0
        ? recipe.recipeTags.map((rt: any) => rt.tag.slug.toLowerCase())
        : [];
      return filterTags.some(filterTag => recipeTags.includes(filterTag));
    });
  }

  // Get total count BEFORE any pagination
  const totalCount = recipes.length;

  // ⚠️ NE PAS paginer ici ! La pagination se fera APRÈS le tri
  // On retourne toutes les recettes filtrées pour permettre le tri correct
  return { recipes: recipes as Recipe[], totalCount };
}

// Combiner toutes les infos utilisateur en une seule requête
async function getUserData(userId?: string): Promise<{
  favoriteIds: Set<number>;
  collections: Array<{ id: number; name: string; count: number; color: string; icon: string }>;
  pseudo: string | null;
  name: string | null;
}> {
  if (!userId) {
    return { favoriteIds: new Set(), collections: [], pseudo: null, name: null };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      pseudo: true,
      name: true,
      favorites: { select: { id: true } },
      collections: {
        include: { _count: { select: { recipes: true } } },
        orderBy: { name: 'asc' }
      }
    }
  });

  if (!user) {
    return { favoriteIds: new Set(), collections: [], pseudo: null, name: null };
  }

  return {
    favoriteIds: new Set(user.favorites.map(f => f.id)),
    collections: user.collections
      .filter(c => c._count.recipes > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        count: c._count.recipes,
        color: c.color,
        icon: c.icon
      })),
    pseudo: user.pseudo,
    name: user.name
  };
}

// Cache les tags populaires pendant 5 minutes pour réduire les requêtes DB
const getPopularTags = unstable_cache(
  async (limit: number = 15): Promise<Array<{ value: string; label: string; count: number }>> => {
    // Utiliser une requête groupBy sur RecipeTag pour compter les tags
    const tagCounts = await db.recipeTag.groupBy({
      by: ['tagId'],
      _count: {
        tagId: true,
      },
      orderBy: {
        _count: {
          tagId: 'desc',
        },
      },
      take: limit,
    });

    // Récupérer les détails des tags
    const tagIds = tagCounts.map(tc => tc.tagId);
    const tags = await db.tag.findMany({
      where: {
        id: { in: tagIds },
      },
    });

    // Combiner les données
    return tagCounts.map(tc => {
      const tag = tags.find(t => t.id === tc.tagId);
      return {
        value: tag?.slug || '',
        label: tag?.name || '',
        count: tc._count.tagId,
      };
    }).filter(t => t.value && t.label);
  },
  ['popular-tags'],
  { revalidate: 300, tags: ['recipes'] } // Cache 5 minutes
);

// Cache les auteurs pendant 5 minutes pour réduire les requêtes DB
const getAllAuthors = unstable_cache(
  async (): Promise<Array<{ id: string; name: string; count: number }>> => {
    const recipes = await db.recipe.findMany({
      where: { deletedAt: null },
      select: { author: true },
    });

    const authorCounts = new Map<string, { id: string; name: string; count: number }>();

    recipes.forEach(recipe => {
      if (recipe.author) {
        const authorName = recipe.author;
        const existing = authorCounts.get(authorName);

        if (existing) {
          existing.count++;
        } else {
          authorCounts.set(authorName, {
            id: authorName,
            name: authorName,
            count: 1,
          });
        }
      }
    });

    return Array.from(authorCounts.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, 'fr');
      });
  },
  ['all-authors'],
  { revalidate: 300, tags: ['recipes'] } // Cache 5 minutes
);

function sortRecipes(recipes: Recipe[], favoriteIds: Set<number>, sortOption?: string): Recipe[] {
  // Si le tri est aléatoire, mélanger les recettes
  if (sortOption === "random") {
    return recipes.sort(() => Math.random() - 0.5);
  }

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
      case "views":
        // Tri par nombre de vues (décroissant)
        const aViews = a.viewsCount || 0;
        const bViews = b.viewsCount || 0;
        if (bViews !== aViews) return bViews - aViews;
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

async function RecipesContent({ searchParams, userId, isAdmin, favoriteIds }: { searchParams: SearchParams; userId?: string; isAdmin: boolean; favoriteIds: Set<number> }) {
  const { recipes, totalCount } = await getRecipes(searchParams, userId);

  // D'abord trier TOUTES les recettes filtrées
  const sortedRecipes = sortRecipes(recipes, favoriteIds, searchParams.sort);

  // Ensuite appliquer la pagination sur les recettes triées
  const currentPage = searchParams.page ? Math.max(1, parseInt(searchParams.page)) : 1;
  const skip = (currentPage - 1) * RECIPES_PER_PAGE;
  const paginatedRecipes = sortedRecipes.slice(skip, skip + RECIPES_PER_PAGE);

  const totalPages = Math.ceil(totalCount / RECIPES_PER_PAGE);

  return (
    <>
      <RecipeListWithDeletion recipes={paginatedRecipes} favoriteIds={favoriteIds} isAdmin={isAdmin} />
      {totalPages > 1 && (
        <RecipePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecipes={totalCount}
          searchParams={searchParams as { [key: string]: string | undefined }}
        />
      )}
    </>
  );
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "OWNER";

  // Lire la préférence de tri sauvegardée dans les cookies
  const cookieStore = await cookies();
  const savedSortPreference = cookieStore.get("user-sort-preference")?.value;

  // Utiliser la préférence sauvegardée si aucun paramètre sort n'est fourni
  const effectiveParams = {
    ...params,
    sort: params.sort || savedSortPreference || undefined,
  };

  // Combiner toutes les requêtes en parallèle pour réduire les opérations DB
  const [userData, popularTags, allAuthors] = await Promise.all([
    getUserData(userId),
    getPopularTags(20),
    getAllAuthors()
  ]);

  const { favoriteIds, collections: userCollections, pseudo: userPseudo, name: userName } = userData;

  // Show banner if user is logged in but has no pseudo or default "Anonyme"
  const showPseudoBanner = userId && (!userPseudo || userPseudo === "Anonyme");

  return (
    <main className="pb-8">
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
              <MobileSearchBar currentSearch={effectiveParams.search} />

              {/* Filters & Sort button mobile */}
              <MobileFiltersSheet
                currentCategory={effectiveParams.category}
                currentSort={effectiveParams.sort}
                currentMaxTime={effectiveParams.maxTime}
                currentTags={effectiveParams.tags ? effectiveParams.tags.split(",") : []}
                availableTags={popularTags}
                currentCollection={effectiveParams.collection}
                userCollections={userCollections}
                currentAuthors={effectiveParams.authors ? effectiveParams.authors.split(",") : []}
                availableAuthors={allAuthors}
              />
            </div>

            {/* Desktop interface - redesigned */}
            <div className="hidden sm:block mb-6">
              <div className="flex gap-3">
                {/* Search bar */}
                <DesktopSearchBar currentSearch={effectiveParams.search} />

                {/* Filters & Sort Sheet */}
                <DesktopFiltersSheet
                  currentCategory={effectiveParams.category}
                  currentSort={effectiveParams.sort}
                  currentMaxTime={effectiveParams.maxTime}
                  currentTags={effectiveParams.tags ? effectiveParams.tags.split(",") : []}
                  availableTags={popularTags}
                  currentCollection={effectiveParams.collection}
                  userCollections={userCollections}
                  currentAuthors={effectiveParams.authors ? effectiveParams.authors.split(",") : []}
                  availableAuthors={allAuthors}
                />

                {/* View Toggle */}
                <RecipeViewToggle />

                {/* Deletion Mode Toggle (admin only) */}
                {isAdmin && <DeletionModeToggleButton isAdmin={isAdmin} />}
              </div>
            </div>

            <Suspense fallback={<RecipeListSkeleton />}>
              <RecipesContent searchParams={effectiveParams} userId={userId} isAdmin={isAdmin} favoriteIds={favoriteIds} />
            </Suspense>
          </section>
        </DeletionModeProvider>
      </ViewProvider>
    </main>
  );
}
