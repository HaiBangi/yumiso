"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { Recipe } from "@/types/recipe";

// Import RecipeForm dynamically without SSR to avoid hydration issues
const RecipeForm = dynamic(
  () => import("./recipe-form").then((mod) => ({ default: mod.RecipeForm })),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="outline"
        size="sm"
        className="text-amber-600 dark:text-amber-400 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border-white/50 dark:border-stone-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:border-amber-300 dark:hover:border-amber-700 opacity-50 cursor-pointer shadow-lg"
        disabled
      >
        <Pencil className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Modifier</span>
      </Button>
    ),
  }
);

interface EditRecipeButtonProps {
  recipe: Recipe;
}

export function EditRecipeButton({ recipe }: EditRecipeButtonProps) {
  return (
    <RecipeForm
      recipe={recipe}
      trigger={
        <Button
          variant="outline"
          size="sm"
          className="text-amber-600 dark:text-amber-400 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border-white/50 dark:border-stone-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:border-amber-300 dark:hover:border-amber-700 cursor-pointer shadow-lg"
        >
          <Pencil className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Modifier</span>
        </Button>
      }
    />
  );
}

