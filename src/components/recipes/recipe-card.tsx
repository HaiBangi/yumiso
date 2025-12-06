import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Star, User } from "lucide-react";
import { RecipeImage } from "./recipe-image";
import { FavoriteButton } from "./favorite-button";
import type { Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
  isFavorited?: boolean;
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

const categoryColors: Record<string, string> = {
  MAIN_DISH: "bg-amber-500 text-white",
  STARTER: "bg-emerald-500 text-white",
  DESSERT: "bg-pink-500 text-white",
  SIDE_DISH: "bg-blue-500 text-white",
  SOUP: "bg-green-500 text-white",
  SALAD: "bg-lime-500 text-white",
  BEVERAGE: "bg-cyan-500 text-white",
  SNACK: "bg-violet-500 text-white",
};

export function RecipeCard({ recipe, isFavorited = false }: RecipeCardProps) {
  const totalTime = recipe.preparationTime + recipe.cookingTime;

  return (
    <Link href={`/recipes/${recipe.id}`} prefetch={false}>
      <Card className="group h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1 border-0 bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-950">
        {/* Image - smaller aspect ratio on mobile */}
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
          <FavoriteButton
            recipeId={recipe.id}
            isFavorited={isFavorited}
            variant="card"
          />
          {recipe.rating > 0 && (
            <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex items-center gap-1 sm:gap-1.5 rounded-full bg-black/50 backdrop-blur-sm px-1.5 py-0.5 sm:px-2.5 sm:py-1 shadow-md">
              <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-amber-400 text-amber-400" />
              <span className="text-xs sm:text-sm font-medium text-white">{recipe.rating}/10</span>
            </div>
          )}
        </div>

        {/* Content - more compact on mobile */}
        <div className="flex flex-col flex-1 p-2.5 sm:px-4 sm:py-2">
          <h3 className="font-sans text-sm sm:text-lg font-semibold leading-snug text-stone-900 dark:text-stone-100 line-clamp-2 group-hover:text-amber-600 transition-colors">
            {recipe.name}
          </h3>
          <p className="flex items-center gap-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5 sm:mt-1">
            <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {recipe.author}
          </p>
          
          {/* Time & Servings */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-2 sm:mt-3">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{totalTime} min</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{recipe.servings} pers.</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
