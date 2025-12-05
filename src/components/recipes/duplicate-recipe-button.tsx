"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
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
        className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 opacity-50 cursor-pointer dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
        disabled
      >
        <Copy className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Dupliquer</span>
      </Button>
    ),
  }
);

interface DuplicateRecipeButtonProps {
  recipe: Recipe;
}

export function DuplicateRecipeButton({ recipe }: DuplicateRecipeButtonProps) {
  // Create a copy of the recipe without the id and userId
  // The author will be set by RecipeForm based on the current user
  const recipeToDuplicate: Recipe = {
    ...recipe,
    id: 0, // Temporary ID to indicate it's a new recipe
    author: "", // Will be set by RecipeForm
  };

  return (
    <RecipeForm
      recipe={recipeToDuplicate}
      trigger={
        <Button
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
        >
          <Copy className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Dupliquer</span>
        </Button>
      }
    />
  );
}

