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
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, RotateCcw, Sparkles } from "lucide-react";
import {usePremium} from "@/hooks/use-premium";
import { useServings } from "./servings-context";

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
  onOptimize?: () => void;
  isOptimizing?: boolean;
}

function formatQuantity(quantity: number | null, multiplier: number): string {
  if (quantity === null) return "";
  const adjusted = quantity * multiplier;

  // Arrondir à 2 décimales maximum
  const rounded = Math.round(adjusted * 100) / 100;

  // Si c'est un entier, afficher sans décimales (500 au lieu de 500.0)
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }

  // Sinon afficher avec jusqu'à 2 décimales, en supprimant les zéros inutiles
  // (0.25 reste 0.25, 1.5 reste 1.5, pas 1.50)
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

function getStorageKey(recipeId: number | undefined): string {
  return `yumiso-checked-ingredients-${recipeId || 'unknown'}`;
}

export function IngredientsCard({ ingredients, ingredientGroups, originalServings, recipeId, onOptimize, isOptimizing = false }: IngredientsCardProps) {
  const { isPremium } = usePremium();
  const { servings, setServings, multiplier } = useServings();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

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

  // Nouvelle fonction pour toggle tout un groupe
  const toggleGroup = useCallback((groupIngredients: Ingredient[]) => {
    const groupIngredientIds = groupIngredients.map(ing => ing.id);
    const allChecked = groupIngredientIds.every(id => checkedIngredients.has(id));

    setCheckedIngredients(prev => {
      const newSet = new Set(prev);
      if (allChecked) {
        // Décocher tous
        groupIngredientIds.forEach(id => newSet.delete(id));
      } else {
        // Cocher tous
        groupIngredientIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  }, [checkedIngredients]);

  const resetChecked = useCallback(() => {
    setCheckedIngredients(new Set());
  }, []);

  const checkedCount = checkedIngredients.size;
  const _totalCount = allIngredients.length;

  // Generate servings options (1-20)
  const servingsOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  // Vérifier si un groupe est entièrement coché
  const isGroupFullyChecked = (groupIngredients: Ingredient[]) => {
    return groupIngredients.every(ing => checkedIngredients.has(ing.id));
  };

  const renderIngredient = (ingredient: Ingredient) => {
    const isChecked = checkedIngredients.has(ingredient.id);
    const checkboxId = `ingredient-${ingredient.id}`;
    return (
      <li
        key={ingredient.id}
        onClick={() => toggleIngredient(ingredient.id)}
        className="flex items-center gap-3 text-sm sm:text-base px-2 py-2.5 sm:py-2 -mx-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer transition-colors active:bg-emerald-100 dark:active:bg-emerald-900/30"
      >
        <Checkbox
          id={checkboxId}
          checked={isChecked}
          onCheckedChange={() => toggleIngredient(ingredient.id)}
          className="h-5 w-5 border-emerald-300 dark:border-emerald-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 cursor-pointer flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        <label
          htmlFor={checkboxId}
          className={`flex-1 cursor-pointer select-none transition-all duration-200 ${
            isChecked
              ? "text-stone-400 dark:text-stone-500 line-through"
              : "text-stone-700 dark:text-stone-200"
          }`}
          onClick={(e) => e.stopPropagation()}
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
            {/* Optimize button (only if handler provided and user is Premium) */}
            {onOptimize && isPremium && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onOptimize}
                      disabled={isOptimizing}
                      className="h-8 px-2 gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs font-medium">
                        {isOptimizing ? "..." : "Optimiser"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs hidden sm:block">
                    <p>Améliorer et normaliser automatiquement les ingrédients et leurs quantités</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

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
              <SelectContent className="z-[100]">
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
            {ingredientGroups.map((group) => {
              const isGroupChecked = isGroupFullyChecked(group.ingredients);
              return (
                <div key={group.id}>
                  <div
                    onClick={() => toggleGroup(group.ingredients)}
                    className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm mb-2 flex items-center gap-2 cursor-pointer hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors py-1 -mx-1 px-1 rounded active:bg-emerald-100 dark:active:bg-emerald-900/30"
                  >
                    <Checkbox
                      checked={isGroupChecked}
                      onCheckedChange={() => toggleGroup(group.ingredients)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 border-emerald-400 dark:border-emerald-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer"
                    />
                    <span className="flex-1">{group.name}</span>
                  </div>
                  <hr className="border-t border-emerald-200 dark:border-emerald-800 mb-3" />
                  <ul className="space-y-1 pl-6">
                    {group.ingredients.map(renderIngredient)}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          // Affichage simple sans groupes
          <ul className="space-y-1">
            {ingredients.map(renderIngredient)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
