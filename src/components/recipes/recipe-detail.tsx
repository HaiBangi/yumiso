import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, Star, Play, Coins } from "lucide-react";
import { RecipeImage } from "./recipe-image";
import { EditRecipeButton } from "./edit-recipe-button";
import { DeleteRecipeButton } from "./delete-recipe-button";
import { RecipeComments } from "./recipe-comments";
import { IngredientsCard } from "./ingredients-card";
import { ShareButtons } from "./share-buttons";
import { ExportPdfButton } from "./export-pdf-button";
import { PersonalNote } from "./personal-note";
import { AddToCollection } from "./add-to-collection";
import { RecipeSteps } from "./recipe-steps";
import Link from "next/link";
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

interface Collection {
  id: number;
  name: string;
  color: string;
  recipes: { id: number }[];
}

interface RecipeWithUserId extends Recipe {
  userId?: string | null;
}

interface RecipeDetailProps {
  recipe: RecipeWithUserId;
  canEdit?: boolean;
  comments?: Comment[];
  userNote?: string | null;
  collections?: Collection[];
  isAuthenticated?: boolean;
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

const costLabels: Record<string, { label: string; emoji: string; color: string }> = {
  CHEAP: { label: "Économique", emoji: "€", color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40" },
  MEDIUM: { label: "Moyen", emoji: "€€", color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40" },
  EXPENSIVE: { label: "Cher", emoji: "€€€", color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40" },
};

export function RecipeDetail({
  recipe,
  canEdit = false,
  comments = [],
  userNote,
  collections = [],
  isAuthenticated = false,
}: RecipeDetailProps) {
  console.log("[RecipeDetail] canEdit prop received:", canEdit);

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
              <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} />
            </div>
          )}

          {/* Video/Share/PDF Buttons - Bottom Right */}
          <div className="absolute bottom-3 right-3 flex gap-2 z-10">
            <ShareButtons title={`${recipe.name} - Gourmiso`} />
            <ExportPdfButton recipe={recipe} />
            {recipe.videoUrl && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="cursor-pointer bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 shadow-lg"
              >
                <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 sm:mr-2 fill-white" />
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
            <p className="text-white/80 text-lg">
              par{" "}
              {recipe.userId ? (
                <Link
                  href={`/users/${recipe.userId}`}
                  className="hover:text-white hover:underline transition-colors"
                >
                  {recipe.author}
                </Link>
              ) : (
                recipe.author
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats Bar */}
        <div className="flex flex-wrap gap-4 sm:gap-6 mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm border border-amber-100 dark:border-amber-900/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/40">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
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
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Personnes
              </p>
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                {recipe.servings} pers.
              </p>
            </div>
          </div>
          {recipe.rating > 0 && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
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
          {recipe.costEstimate && costLabels[recipe.costEstimate] && (
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${costLabels[recipe.costEstimate].color.split(' ').slice(1).join(' ')}`}>
                <Coins className={`h-5 w-5 ${costLabels[recipe.costEstimate].color.split(' ')[0]} ${costLabels[recipe.costEstimate].color.split(' ')[1] || ''}`} />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                  Coût
                </p>
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  {costLabels[recipe.costEstimate].emoji} {costLabels[recipe.costEstimate].label}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User Actions (Collections, Notes) */}
        {isAuthenticated && (
          <div className="flex flex-wrap gap-3 mb-6">
            <AddToCollection recipeId={recipe.id} collections={collections} />
            <PersonalNote recipeId={recipe.id} initialNote={userNote} />
          </div>
        )}

        {/* Description */}
        {recipe.description && (
          <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 mb-6 sm:mb-8 leading-relaxed">
            {recipe.description}
          </p>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-5">
          {/* Ingredients with Portion Adjuster */}
          <IngredientsCard
            ingredients={recipe.ingredients}
            originalServings={recipe.servings}
            recipeId={recipe.id}
          />

          {/* Steps */}
          <RecipeSteps steps={recipe.steps} />
        </div>

        {/* Comments Section */}
        <div className="mt-6 sm:mt-8">
          <RecipeComments recipeId={recipe.id} comments={comments} />
        </div>
      </div>
    </div>
  );
}
