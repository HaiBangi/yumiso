"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatTime } from "@/lib/utils";

interface EditMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: any;
  onSuccess: () => void;
}

export function EditMealDialog({ open, onOpenChange, meal, onSuccess }: EditMealDialogProps) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRecipes, setIsFetchingRecipes] = useState(false);
  const [portionsDesired, setPortionsDesired] = useState(meal?.servings || 2);

  useEffect(() => {
    if (open) {
      fetchRecipes();
      setPortionsDesired(meal?.servings || 2);
    }
  }, [open, meal]);

  const fetchRecipes = async () => {
    setIsFetchingRecipes(true);
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsFetchingRecipes(false);
    }
  };

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae");
  };

  const filteredRecipes = recipes.filter((r) => {
    if (!searchTerm.trim()) return true;
    
    const normalizedSearch = normalizeText(searchTerm);
    const normalizedName = normalizeText(r.name);
    
    const searchWords = normalizedSearch.split(/\s+/);
    return searchWords.every(word => normalizedName.includes(word));
  });

  const handleUpdate = async () => {
    if (!selectedRecipe) return;

    setIsLoading(true);
    try {
      await fetch(`/api/meal-planner/meal/${meal.id}`, {
        method: "DELETE",
      });

      const res = await fetch(`/api/meal-planner/meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: meal.weeklyMealPlanId,
          dayOfWeek: meal.dayOfWeek,
          timeSlot: meal.timeSlot,
          mealType: meal.mealType,
          recipeId: selectedRecipe.id,
          portionsUsed: portionsDesired,
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la mise à jour du repas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Modifier le repas - {meal?.dayOfWeek} à {meal?.timeSlot}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Rechercher une recette..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {isFetchingRecipes ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
                <p className="text-sm text-stone-500">Chargement des recettes...</p>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <p className="text-sm">Aucune recette trouvée</p>
              </div>
            ) : (
              filteredRecipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className={`p-3 cursor-pointer transition-all ${
                    selectedRecipe?.id === recipe.id
                      ? "border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "hover:border-emerald-300"
                  }`}
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{recipe.name}</h4>
                      <p className="text-sm text-stone-500">
                        ⏱ {formatTime(recipe.preparationTime + recipe.cookingTime)} • 🍽 {recipe.servings} portions
                        {recipe.caloriesPerServing && ` • 🔥 ${recipe.caloriesPerServing} kcal`}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Portions désirées:</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPortionsDesired((prev: number) => Math.max(1, prev - 1))}
              disabled={isLoading}
              className="h-8 px-3"
            >
              -
            </Button>
            <Input
              type="number"
              value={portionsDesired}
              onChange={(e) => setPortionsDesired(Math.max(1, Number(e.target.value)))}
              className="w-16 h-8 text-center"
              disabled={isLoading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPortionsDesired((prev: number) => prev + 1)}
              disabled={isLoading}
              className="h-8 px-3"
            >
              +
            </Button>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!selectedRecipe || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Mettre à jour"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
