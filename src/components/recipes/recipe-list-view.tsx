import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, Users, Star, ChefHat } from "lucide-react";
import { RecipeImage } from "./recipe-image";
import { FavoriteButton } from "./favorite-button";
import { RecipeCheckbox } from "./deletion-mode";
import type { Recipe } from "@/types/recipe";

interface RecipeListViewProps {
  recipes: Recipe[];
  favoriteIds?: Set<number>;
  isDeletionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelection?: (id: number) => void;
}

const categoryLabels: Record<string, string> = {
  MAIN_DISH: "Plat principal",
  STARTER: "Entrée",
  DESSERT: "Dessert",
  SIDE_DISH: "Accompagnement",
  SOUP: "Soupe",
  SALAD: "Salade",
  BEVERAGE: "Boisson",
  SNACK: "En-cas",
};

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
    <div className="space-y-4">
      {recipes.map((recipe) => (
        <Card
          key={recipe.id}
          className="overflow-hidden hover:shadow-lg transition-shadow duration-200 relative"
        >
          {isDeletionMode && onToggleSelection && (
            <RecipeCheckbox
              recipeId={recipe.id}
              isSelected={selectedIds.has(recipe.id)}
              onToggle={onToggleSelection}
            />
          )}

          <div className="flex flex-col sm:flex-row">
            {/* Image */}
            <Link
              href={`/recipes/${recipe.id}`}
              className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 overflow-hidden bg-stone-200 dark:bg-stone-800"
            >
              <RecipeImage
                src={recipe.imageUrl}
                alt={recipe.name}
                sizes="(max-width: 640px) 100vw, 192px"
                className="object-cover"
              />
            </Link>

            {/* Content */}
            <div className="flex-1 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/recipes/${recipe.id}`}>
                    <h3 className="text-lg sm:text-xl font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-1">
                      {recipe.name}
                    </h3>
                  </Link>
                  
                  <div className="flex items-center gap-2 mt-1 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {categoryLabels[recipe.category] || recipe.category}
                    </Badge>
                    {recipe.rating > 0 && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="text-xs font-medium">{recipe.rating}/10</span>
                      </div>
                    )}
                  </div>

                  {recipe.description && (
                    <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2 mb-3">
                      {recipe.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{recipe.preparationTime + recipe.cookingTime} min</span>
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

                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {recipe.tags.slice(0, 4).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {recipe.tags.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{recipe.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Favorite Button */}
                <FavoriteButton
                  recipeId={recipe.id}
                  isFavorited={favoriteIds.has(recipe.id)}
                />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

