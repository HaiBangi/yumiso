import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye, Star, User, FileText, EyeOff } from "lucide-react";
import { RecipeImage } from "./recipe-image";
import { FavoriteButton } from "./favorite-button";
import { formatTime } from "@/lib/utils";
import { RecipeStatus } from "@/lib/recipe-status";
import { categoryLabels } from "@/lib/category-labels";
import type { Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
  isFavorited?: boolean;
  isDeletionMode?: boolean;
}

const categoryColors: Record<string, string> = {
  MAIN_DISH: "bg-emerald-700 text-white",
  STARTER: "bg-emerald-500 text-white",
  DESSERT: "bg-pink-500 text-white",
  SIDE_DISH: "bg-blue-500 text-white",
  SOUP: "bg-green-500 text-white",
  SALAD: "bg-lime-500 text-white",
  BEVERAGE: "bg-cyan-500 text-white",
  SNACK: "bg-violet-500 text-white",
  APPETIZER: "bg-orange-500 text-white",
  BREAKFAST: "bg-yellow-500 text-white",
  BRUNCH: "bg-amber-500 text-white",
  SAUCE: "bg-red-500 text-white",
  MARINADE: "bg-red-600 text-white",
  DRESSING: "bg-teal-500 text-white",
  SPREAD: "bg-amber-600 text-white",
  BREAD: "bg-yellow-600 text-white",
  PASTRY: "bg-orange-400 text-white",
  CAKE: "bg-pink-600 text-white",
  COOKIE: "bg-orange-600 text-white",
  SMOOTHIE: "bg-purple-500 text-white",
  COCKTAIL: "bg-fuchsia-500 text-white",
  PRESERVES: "bg-rose-500 text-white",
  OTHER: "bg-stone-500 text-white",
};

export function RecipeCard({ recipe, isFavorited = false, isDeletionMode = false }: RecipeCardProps) {
  const totalTime = recipe.preparationTime + recipe.cookingTime;

  const cardContent = (
    <Card className="group h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1 border-0 bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-950">
      {/* Image - original aspect ratio */}
      <div className="relative aspect-[3/2] sm:aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800">
        <RecipeImage
          src={recipe.imageUrl}
          alt={recipe.name}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          iconSize="sm"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <Badge
          className={`absolute top-2 left-2 sm:top-3 sm:left-3 border-0 shadow-md text-xs sm:text-sm px-1.5 py-0.5 sm:px-2.5 sm:py-1 ${categoryColors[recipe.category] || "bg-stone-500 text-white"}`}
        >
          {categoryLabels[recipe.category] || recipe.category}
        </Badge>

        {/* Status badge for DRAFT/PRIVATE recipes */}
        {recipe.status && recipe.status !== RecipeStatus.PUBLIC && (
          <div className={`absolute top-2 right-12 sm:top-3 sm:right-14 flex items-center gap-1 px-2 py-1 rounded-md shadow-md text-xs font-medium ${
            recipe.status === RecipeStatus.DRAFT
              ? "bg-amber-500/90 text-white"
              : "bg-indigo-500/90 text-white"
          }`}>
            {recipe.status === RecipeStatus.DRAFT ? (
              <>
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">Brouillon</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" />
                <span className="hidden sm:inline">Privé</span>
              </>
            )}
          </div>
        )}

        <FavoriteButton
          recipeId={recipe.id}
          isFavorited={isFavorited}
          variant="card"
        />

        {/* Stats en bas : Temps à gauche, Vues + Note à droite */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          {/* Temps de préparation à gauche */}
          <div className="flex items-center gap-1 bg-black/70 dark:bg-stone-900/80 px-2 py-1 rounded-md backdrop-blur-sm">
            <Clock className="h-3 w-3 text-emerald-300" />
            <span className="text-xs font-medium text-white">{formatTime(totalTime)}</span>
          </div>

          {/* Vues + Note à droite */}
          <div className="flex items-center gap-1.5">
            {recipe.viewsCount !== undefined && recipe.viewsCount > 0 && (
              <div className="flex items-center gap-1 bg-black/70 dark:bg-stone-900/80 px-2 py-1 rounded-md backdrop-blur-sm">
                <Eye className="h-3 w-3 text-sky-300" />
                <span className="text-xs font-medium text-white">{recipe.viewsCount}</span>
              </div>
            )}
            {recipe.rating > 0 && (
              <div className="flex items-center gap-1 bg-black/80 dark:bg-stone-900/90 px-2 py-1 rounded-md backdrop-blur-sm">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium text-white">{recipe.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content - more compact on mobile */}
      <div className="flex flex-col flex-1 p-2.5 sm:px-4 sm:py-2.5">
        <h3 className="font-sans text-sm sm:text-lg font-semibold leading-snug text-stone-900 dark:text-stone-100 line-clamp-2 group-hover:text-amber-600 transition-colors mb-auto">
          {recipe.name}
        </h3>

        {/* Author badge - subtle and elegant */}
        <div className="mt-2 flex items-center">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-stone-100 to-stone-50 dark:from-stone-800/50 dark:to-stone-800/30 border border-stone-200/50 dark:border-stone-700/50 backdrop-blur-sm">
            <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-stone-400 dark:text-stone-500" />
            <span className="text-[10px] sm:text-xs font-medium text-stone-500 dark:text-stone-400 tracking-wide">
              {recipe.author}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );

  // En mode suppression, retourner juste le contenu sans Link
  if (isDeletionMode) {
    return cardContent;
  }

  // Sinon, envelopper dans un Link
  return (
    <Link href={`/recipes/${recipe.slug || recipe.id}`} prefetch={false}>
      {cardContent}
    </Link>
  );
}
