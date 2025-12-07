"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, RotateCcw } from "lucide-react";

interface Ingredient {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  order?: number;
  groupId?: number | null;
}

interface IngredientGroup {
  id: number;
  name: string;
  order: number;
  ingredients: Ingredient[];
}

interface IngredientsCardProps {
  ingredients: Ingredient[];
  ingredientGroups?: IngredientGroup[];
  originalServings: number;
  recipeId?: number;
}

function formatQuantity(quantity: number | null, multiplier: number): string {
  if (quantity === null) return "";
  const adjusted = quantity * multiplier;

  // Round to nice fractions
  if (adjusted < 0.1) return adjusted.toFixed(2);
  if (adjusted < 1) {
    const rounded = Math.round(adjusted * 10) / 10;
    return rounded.toString();
  }
  if (Number.isInteger(adjusted)) return adjusted.toString();
  return (Math.round(adjusted * 10) / 10).toString();
}

function getStorageKey(recipeId: number | undefined): string {
  return `gourmiso-checked-ingredients-${recipeId || 'unknown'}`;
}

export function IngredientsCard({ ingredients, ingredientGroups, originalServings, recipeId }: IngredientsCardProps) {
  const [servings, setServings] = useState(originalServings);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);
  const multiplier = servings / originalServings;

  // Déterminer si on doit afficher en mode groupes ou simple
  const hasGroups = ingredientGroups && ingredientGroups.length > 0;

  // Récupérer tous les ingrédients (soit depuis les groupes, soit directement)
  const allIngredients = hasGroups
    ? ingredientGroups.flatMap(g => g.ingredients)
    : ingredients;

  // Load checked state from localStorage on mount
  useEffect(() => {
    if (recipeId) {
      const stored = localStorage.getItem(getStorageKey(recipeId));
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCheckedIngredients(new Set(parsed));
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
    setIsHydrated(true);
  }, [recipeId]);

  // Save to localStorage when checked state changes
  useEffect(() => {
    if (isHydrated && recipeId) {
      localStorage.setItem(
        getStorageKey(recipeId),
        JSON.stringify([...checkedIngredients])
      );
    }
  }, [checkedIngredients, recipeId, isHydrated]);

  const toggleIngredient = useCallback((ingredientId: number) => {
    setCheckedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  }, []);

  const resetChecked = useCallback(() => {
    setCheckedIngredients(new Set());
  }, []);

  const checkedCount = checkedIngredients.size;
  const totalCount = allIngredients.length;

  // Generate servings options (1-20)
  const servingsOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  const renderIngredient = (ingredient: Ingredient) => {
    const isChecked = checkedIngredients.has(ingredient.id);
    const checkboxId = `ingredient-${ingredient.id}`;
    return (
      <li
        key={ingredient.id}
        className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base"
      >
        <Checkbox
          id={checkboxId}
          checked={isChecked}
          onCheckedChange={() => toggleIngredient(ingredient.id)}
          className="h-5 w-5 border-emerald-300 dark:border-emerald-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 cursor-pointer"
        />
        <label
          htmlFor={checkboxId}
          className={`cursor-pointer select-none transition-all duration-200 ${
            isChecked
              ? "text-stone-400 dark:text-stone-500 line-through"
              : "text-stone-700 dark:text-stone-200"
          }`}
        >
          {ingredient.quantity && (
            <span className={isChecked ? "font-normal" : "font-medium"}>
              {formatQuantity(ingredient.quantity, multiplier)}{" "}
            </span>
          )}
          {ingredient.unit && (
            <span className={isChecked ? "text-stone-400 dark:text-stone-500" : "text-stone-500 dark:text-stone-400"}>
              {ingredient.unit}{" "}
            </span>
          )}
          {ingredient.name}
        </label>
      </li>
    );
  };

  return (
    <Card className="md:col-span-2 border border-emerald-100 dark:border-emerald-900/50 shadow-sm bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm pb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <span className="text-xl sm:text-2xl">🥗</span>
            Ingrédients
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Reset button */}
            {checkedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetChecked}
                className="h-8 px-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                title="Réinitialiser"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}

            {/* Portion Adjuster Dropdown */}
            <Select
              value={servings.toString()}
              onValueChange={(value) => setServings(parseInt(value))}
            >
              <SelectTrigger className="w-[80px] h-8 cursor-pointer dark:bg-stone-700 dark:border-stone-600">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="dark:text-stone-100">{servings}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {servingsOptions.map((num) => (
                  <SelectItem key={num} value={num.toString()} className="cursor-pointer">
                    {num} pers.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {servings !== originalServings && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 text-right">
            Quantités ajustées (×{multiplier.toFixed(1)})
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        {hasGroups ? (
          // Affichage avec groupes
          <div className="space-y-6">
            {ingredientGroups.map((group) => (
              <div key={group.id}>
                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                  {group.name}
                </h4>
                <ul className="space-y-2 sm:space-y-3 pl-3">
                  {group.ingredients.map(renderIngredient)}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          // Affichage simple sans groupes
          <ul className="space-y-2 sm:space-y-3">
            {ingredients.map(renderIngredient)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
