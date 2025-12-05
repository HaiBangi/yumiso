import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Users, Star, ChefHat, Play, Pencil, Trash2 } from "lucide-react";
import { RecipeForm } from "./recipe-form";
import { DeleteRecipeDialog } from "./delete-recipe-dialog";
import type { Recipe } from "@/types/recipe";

interface RecipeDetailProps {
  recipe: Recipe;
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

export function RecipeDetail({ recipe }: RecipeDetailProps) {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[40vh] min-h-[300px] max-h-[500px] w-full overflow-hidden bg-stone-900">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.name}
            fill
            className="object-cover opacity-80"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <ChefHat className="h-32 w-32 text-stone-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Top Navigation */}
        <div className="absolute top-6 left-6 right-6 flex justify-between">
          <Button
            asChild
            variant="ghost"
            className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white"
          >
            <Link href="/recipes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>

          <div className="flex gap-2">
            {recipe.videoUrl && (
              <Button
                asChild
                variant="ghost"
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white"
              >
                <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="mr-2 h-4 w-4" />
                  Vidéo
                </a>
              </Button>
            )}

            <RecipeForm
              recipe={recipe}
              trigger={
                <Button
                  variant="ghost"
                  className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              }
            />

            <DeleteRecipeDialog
              recipeId={recipe.id}
              recipeName={recipe.name}
              redirectAfterDelete
              trigger={
                <Button
                  variant="ghost"
                  className="bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              }
            />
          </div>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="mx-auto max-w-4xl">
            <Badge className="mb-3 bg-amber-500 hover:bg-amber-600 text-white border-0">
              {categoryLabels[recipe.category] || recipe.category}
            </Badge>
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-white mb-2">
              {recipe.name}
            </h1>
            <p className="text-white/80 text-lg">par {recipe.author}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Stats Bar */}
        <div className="flex flex-wrap gap-6 mb-10 p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-stone-900 dark:to-stone-800 border border-amber-100 dark:border-stone-700">
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
          <p className="text-lg text-stone-600 dark:text-stone-300 mb-10 leading-relaxed">
            {recipe.description}
          </p>
        )}

        <div className="grid gap-8 md:grid-cols-5">
          {/* Ingredients */}
          <Card className="md:col-span-2 border-0 shadow-lg bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-950">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <span className="text-2xl">🥗</span>
                Ingrédients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-start gap-3 text-stone-700 dark:text-stone-300"
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
          <Card className="md:col-span-3 border-0 shadow-lg bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-950">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <span className="text-2xl">👨‍🍳</span>
                Préparation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-6">
                {recipe.steps.map((step) => (
                  <li key={step.id} className="flex gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-sm font-bold text-white shadow-md">
                      {step.order}
                    </span>
                    <p className="text-stone-700 dark:text-stone-300 leading-relaxed pt-1">
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
