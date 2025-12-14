"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Users, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RecipeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: any;
}

export function RecipeDetailDialog({ open, onOpenChange, meal }: RecipeDetailDialogProps) {
  const [recipe, setRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && meal.recipeId) {
      fetchFullRecipe();
    }
  }, [open, meal]);

  const fetchFullRecipe = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/recipes/${meal.recipeId}`);
      if (res.ok) {
        const data = await res.json();
        setRecipe(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la recette:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Si c'est une recette existante
  const fullRecipe = recipe || meal.recipe;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-10">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-2xl font-bold flex-1">
              {meal.name}
            </DialogTitle>
            {meal.recipeId && (
              <Button asChild variant="outline" size="sm" className="gap-2 flex-shrink-0">
                <Link href={`/recipes/${meal.recipeId}`} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Voir la recette complète</span>
                  <span className="sm:hidden">Recette</span>
                </Link>
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Row */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span>{meal.prepTime + meal.cookTime} min</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <span>{meal.servings} portions</span>
              </div>
              {meal.calories && (
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-emerald-600" />
                  <span>{meal.calories} kcal</span>
                </div>
              )}
            </div>

            {/* Ingredients */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-xl">🥗</span>
                Ingrédients
              </h3>
              <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-4">
                {fullRecipe?.ingredients?.length > 0 ? (
                  <div className="space-y-2">
                    {fullRecipe.ingredients.map((ing: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                        <span>
                          {ing.quantity && ing.unit ? `${ing.quantity} ${ing.unit} ` : ''}
                          {ing.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {Array.isArray(meal.ingredients) ? (
                      meal.ingredients.map((ing: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                          <span>{ing}</span>
                        </li>
                      ))
                    ) : (
                      <li>Aucun ingrédient</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Steps */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-xl">👨‍🍳</span>
                Préparation
              </h3>
              <div className="space-y-3">
                {fullRecipe?.steps?.length > 0 ? (
                  fullRecipe.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                        {step.order}
                      </div>
                      <p className="flex-1 pt-1 text-stone-700 dark:text-stone-300 leading-relaxed">
                        {step.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <ol className="space-y-2">
                    {Array.isArray(meal.steps) ? (
                      meal.steps.map((step: string, idx: number) => (
                        <li key={idx} className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>
                          <p className="flex-1 pt-1 text-stone-700 dark:text-stone-300 leading-relaxed">
                            {step}
                          </p>
                        </li>
                      ))
                    ) : (
                      <li>Aucune étape</li>
                    )}
                  </ol>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
