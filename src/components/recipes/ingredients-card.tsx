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
}

interface IngredientsCardProps {
  ingredients: Ingredient[];
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

export function IngredientsCard({ ingredients, originalServings, recipeId }: IngredientsCardProps) {
  const [servings, setServings] = useState(originalServings);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);
  const multiplier = servings / originalServings;

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
  const totalCount = ingredients.length;

  // Generate servings options (1-20)
  const servingsOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <Card className="md:col-span-2 border border-amber-100 shadow-sm bg-white/80 backdrop-blur-sm pb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2">
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
                className="h-8 px-2 text-stone-500 hover:text-stone-700"
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
              <SelectTrigger className="w-[80px] h-8 cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span>{servings}</span>
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
          <p className="text-xs text-amber-600 mt-1 text-right">
            Quantités ajustées (×{multiplier.toFixed(1)})
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <ul className="space-y-2 sm:space-y-3">
          {ingredients.map((ingredient) => {
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
                  className="h-5 w-5 border-amber-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 cursor-pointer"
                />
                <label
                  htmlFor={checkboxId}
                  className={`cursor-pointer select-none transition-all duration-200 ${
                    isChecked
                      ? "text-stone-400 line-through"
                      : "text-stone-700"
                  }`}
                >
                  {ingredient.quantity && (
                    <span className={isChecked ? "font-normal" : "font-medium"}>
                      {formatQuantity(ingredient.quantity, multiplier)}{" "}
                    </span>
                  )}
                  {ingredient.unit && (
                    <span className={isChecked ? "text-stone-400" : "text-stone-500"}>
                      {ingredient.unit}{" "}
                    </span>
                  )}
                  {ingredient.name}
                </label>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
