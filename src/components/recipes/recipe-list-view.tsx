import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, Users, Star, ChefHat } from "lucide-react";
import { RecipeImage } from "./recipe-image";
import { FavoriteButton } from "./favorite-button";
import { RecipeCheckbox } from "./deletion-mode";
import { formatTime } from "@/lib/utils";
import type { Recipe } from "@/types/recipe";

interface RecipeListViewProps {
  recipes: Recipe[];
  favoriteIds?: Set<number>;
  isDeletionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelection?: (id: number) => void;
}

export function RecipeListView({
  recipes,
  favoriteIds = new Set(),
  isDeletionMode = false,
  selectedIds = new Set(),
  onToggleSelection
}: RecipeListViewProps) {
  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
        <div className="rounded-full bg-stone-100 dark:bg-stone-800 p-6 sm:p-8 mb-4 sm:mb-6">
          <svg
            className="h-12 w-12 sm:h-16 sm:w-16 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-medium text-stone-900 dark:text-stone-100">
          Aucune recette
        </h3>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-stone-500 dark:text-stone-400">
          Ajoutez votre première recette pour commencer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-4">
      {recipes.map((recipe) => {
        const cardContent = (
          <Card
            className={`overflow-hidden hover:shadow-lg transition-all duration-200 relative cursor-pointer ${
              isDeletionMode && selectedIds.has(recipe.id)
                ? 'ring-4 ring-red-500 dark:ring-red-600 bg-red-50 dark:bg-red-950/20'
                : isDeletionMode
                  ? 'hover:ring-2 hover:ring-red-200 dark:hover:ring-red-800'
                  : ''
            }`}
            onClick={() => {
              if (isDeletionMode && onToggleSelection) {
                onToggleSelection(recipe.id);
              }
            }}
          >
            {isDeletionMode && onToggleSelection && (
              <RecipeCheckbox
                recipeId={recipe.id}
                isSelected={selectedIds.has(recipe.id)}
                onToggle={() => {}}
              />
            )}

            {/* Mobile: Compact horizontal layout with name overlay on image */}
            <div className="flex sm:hidden">
              {/* Image with overlay */}
              <div className="relative w-28 h-24 flex-shrink-0 overflow-hidden bg-stone-200 dark:bg-stone-800">
                <RecipeImage
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  sizes="112px"
                  className="object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {/* Time badge */}
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{formatTime(recipe.preparationTime + recipe.cookingTime)}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
                <div>
                  <h3 className={`text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-tight ${
                    !isDeletionMode ? 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' : ''
                  }`}>
                    {recipe.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">
                      {recipe.category}
                    </span>
                    {recipe.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] text-stone-600 dark:text-stone-300">{recipe.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-stone-400 truncate">{recipe.author}</span>
                  <div onClick={(e) => e.preventDefault()}>
                    <FavoriteButton
                      recipeId={recipe.id}
                      isFavorited={favoriteIds.has(recipe.id)}
                      variant="compact"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Full layout */}
            <div className="hidden sm:flex sm:flex-row">
              {/* Image */}
              <div className="relative w-48 h-auto flex-shrink-0 overflow-hidden bg-stone-200 dark:bg-stone-800">
                <RecipeImage
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  sizes="192px"
                  className="object-cover"
                />
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xl font-semibold text-stone-900 dark:text-stone-100 line-clamp-1 ${
                      !isDeletionMode ? 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors' : ''
                    }`}>
                      {recipe.name}
                    </h3>

                    <div className="flex items-center gap-2 mt-1 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {recipe.category}
                      </Badge>
                      {recipe.rating > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-black/80 dark:bg-stone-900/90 rounded-md backdrop-blur-sm">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs font-medium text-white">{recipe.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {recipe.description && (
                      <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2 mb-3">
                        {recipe.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(recipe.preparationTime + recipe.cookingTime)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{recipe.servings} pers.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ChefHat className="h-4 w-4" />
                        <span className="truncate">{recipe.author}</span>
                      </div>
                    </div>

                    {recipe.recipeTags && recipe.recipeTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {recipe.recipeTags.slice(0, 4).map((rt: any) => (
                          <Badge
                            key={rt.tag.slug}
                            variant="outline"
                            className="text-xs bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                          >
                            {rt.tag.name}
                          </Badge>
                        ))}
                        {recipe.recipeTags.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{recipe.recipeTags.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Favorite Button */}
                  <div onClick={(e) => e.preventDefault()}>
                    <FavoriteButton
                      recipeId={recipe.id}
                      isFavorited={favoriteIds.has(recipe.id)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );

        // En mode suppression, retourner juste la card
        if (isDeletionMode) {
          return <div key={recipe.id}>{cardContent}</div>;
        }

        // Sinon, wrapper avec un Link pour rendre toute la card cliquable
        return (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.slug || recipe.id}`}
            className="block group"
          >
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}
