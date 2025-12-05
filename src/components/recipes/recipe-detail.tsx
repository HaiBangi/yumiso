import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Users, Star, Play, Trash2 } from "lucide-react";
import { RecipeImage } from "./recipe-image";
import { EditRecipeButton } from "./edit-recipe-button";
import { DeleteRecipeDialog } from "./delete-recipe-dialog";
import { UserButton } from "@/components/auth/user-button";
import type { Recipe } from "@/types/recipe";

interface RecipeDetailProps {
  recipe: Recipe;
  canEdit?: boolean;
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

export function RecipeDetail({ recipe, canEdit = false }: RecipeDetailProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Top Navigation Bar */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center">
          <Button
            asChild
            variant="outline"
            className="cursor-pointer"
          >
            <Link href="/recipes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>

          <div className="flex gap-2 items-center">
            {recipe.videoUrl && (
              <Button
                asChild
                variant="outline"
                className="cursor-pointer"
              >
                <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="mr-2 h-4 w-4" />
                  Vidéo
                </a>
              </Button>
            )}

            {canEdit && (
              <>
                <EditRecipeButton recipe={recipe} />

                <DeleteRecipeDialog
                  recipeId={recipe.id}
                  recipeName={recipe.name}
                  redirectAfterDelete
                  trigger={
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </Button>
                  }
                />
              </>
            )}

            <UserButton />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="relative h-[250px] sm:h-[300px] w-full overflow-hidden rounded-2xl bg-stone-900 shadow-xl">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.name}
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover opacity-80"
            iconSize="lg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <Badge className="mb-2 bg-amber-500 hover:bg-amber-600 text-white border-0">
              {categoryLabels[recipe.category] || recipe.category}
            </Badge>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
              {recipe.name}
            </h1>
            <p className="text-white/80 text-lg">par {recipe.author}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats Bar */}
        <div className="flex flex-wrap gap-4 sm:gap-6 mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-amber-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Préparation
              </p>
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                {recipe.preparationTime} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Cuisson
              </p>
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                {recipe.cookingTime} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Portions
              </p>
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                {recipe.servings} personnes
              </p>
            </div>
          </div>
          {recipe.rating > 0 && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Star className="h-5 w-5 text-yellow-600 fill-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                  Note
                </p>
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  {recipe.rating}/10
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-base sm:text-lg text-stone-600 mb-6 sm:mb-8 leading-relaxed">
            {recipe.description}
          </p>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-5">
          {/* Ingredients */}
          <Card className="md:col-span-2 border border-amber-100 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2">
                <span className="text-xl sm:text-2xl">🥗</span>
                Ingrédients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 sm:space-y-3">
                {recipe.ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base text-stone-700"
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <span>
                      {ingredient.quantity && (
                        <span className="font-medium">{ingredient.quantity} </span>
                      )}
                      {ingredient.unit && (
                        <span className="text-stone-500">{ingredient.unit} </span>
                      )}
                      {ingredient.name}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card className="md:col-span-3 border border-amber-100 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2">
                <span className="text-xl sm:text-2xl">👨‍🍳</span>
                Préparation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 sm:space-y-6">
                {recipe.steps.map((step) => (
                  <li key={step.id} className="flex gap-3 sm:gap-4">
                    <span className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-xs sm:text-sm font-bold text-white shadow-md">
                      {step.order}
                    </span>
                    <p className="text-sm sm:text-base text-stone-700 leading-relaxed pt-0.5 sm:pt-1">
                      {step.text}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
