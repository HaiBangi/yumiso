import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, Star, Play, Trash2 } from "lucide-react";
import { RecipeImage } from "./recipe-image";
import { EditRecipeButton } from "./edit-recipe-button";
import { DeleteRecipeDialog } from "./delete-recipe-dialog";
import { RecipeComments } from "./recipe-comments";
import { IngredientsCard } from "./ingredients-card";
import { ShareButtons } from "./share-buttons";
import type { Recipe } from "@/types/recipe";

interface Comment {
  id: number;
  text: string;
  rating: number | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    pseudo: string;
    image: string | null;
  };
}

interface RecipeDetailProps {
  recipe: Recipe;
  canEdit?: boolean;
  comments?: Comment[];
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

export function RecipeDetail({ recipe, canEdit = false, comments = [] }: RecipeDetailProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      {/* Hero Section */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4">
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

          {/* Tags - Top Left */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <Badge className="bg-amber-500/90 hover:bg-amber-600 text-white border-0 backdrop-blur-sm shadow-lg">
              {categoryLabels[recipe.category] || recipe.category}
            </Badge>
            {recipe.tags && recipe.tags.length > 0 && recipe.tags.slice(0, 3).map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-white/90 text-stone-700 border-0 backdrop-blur-sm shadow-lg"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Edit/Delete Buttons - Top Right */}
          {canEdit && (
            <div className="absolute top-3 right-3 flex gap-2 z-10">
              <EditRecipeButton recipe={recipe} />
              <DeleteRecipeDialog
                recipeId={recipe.id}
                recipeName={recipe.name}
                redirectAfterDelete
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 dark:text-red-400 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border-white/50 dark:border-stone-700/50 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-300 dark:hover:border-red-700 cursor-pointer shadow-lg"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </Button>
                }
              />
            </div>
          )}

          {/* Video/Share Buttons - Bottom Right */}
          <div className="absolute bottom-3 right-3 flex gap-2 z-10">
            <ShareButtons title={`${recipe.name} - Gourmiso`} />
            {recipe.videoUrl && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="cursor-pointer bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border-white/50 dark:border-stone-700/50 hover:bg-white dark:hover:bg-stone-800 shadow-lg"
              >
                <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Vidéo</span>
                </a>
              </Button>
            )}
          </div>

          {/* Title Overlay - Bottom Left */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pr-32 sm:pr-40">
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
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="font-semibold text-stone-900 dark:text-stone-100 text-lg">
              {recipe.servings}
            </p>
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
          {/* Ingredients with Portion Adjuster */}
          <IngredientsCard
            ingredients={recipe.ingredients}
            originalServings={recipe.servings}
          />

          {/* Steps */}
          <Card className="md:col-span-3 border border-amber-100 shadow-sm bg-white/80 backdrop-blur-sm pb-4">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2">
                <span className="text-xl sm:text-2xl">👨‍🍳</span>
                Préparation
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
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

        {/* Comments Section */}
        <div className="mt-6 sm:mt-8">
          <RecipeComments recipeId={recipe.id} comments={comments} />
        </div>
      </div>
    </div>
  );
}
