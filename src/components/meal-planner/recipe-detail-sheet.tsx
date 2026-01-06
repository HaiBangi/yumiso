"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Users, Flame, Check, X, Star, Coins, Plus, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { UnsplashAttribution } from "@/components/ui/unsplash-attribution";

interface RecipeDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal?: any;
  // Pour les recettes supprimées
  deletedRecipe?: any;
  onRestore?: () => void;
  isRestoring?: boolean;
  onCreateRecipe?: (mealData: any) => void;
}

export function RecipeDetailSheet({ open, onOpenChange, meal, deletedRecipe, onRestore, isRestoring, onCreateRecipe }: RecipeDetailSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isMounted, setIsMounted] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Mode recette supprimée
  const isDeletedMode = !!deletedRecipe;

  // Attendre que le composant soit monté pour éviter les problèmes de hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (open && meal?.recipeId && !isDeletedMode) {
      fetchFullRecipe();
    }
  }, [open, meal, isDeletedMode]);

  const fetchFullRecipe = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/recipes/${displayData?.recipeId}`);
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

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const isGroupFullyChecked = (groupIngredients: any[], allIngredients: any[]) => {
    if (!groupIngredients || groupIngredients.length === 0) return false;
    return groupIngredients.every((ing) => {
      const globalIdx = allIngredients.findIndex((i) => i.id === ing.id);
      return checkedIngredients.has(globalIdx);
    });
  };

  const toggleGroup = (groupIngredients: any[], allIngredients: any[]) => {
    const isFullyChecked = isGroupFullyChecked(groupIngredients, allIngredients);
    setCheckedIngredients((prev) => {
      const newSet = new Set(prev);
      groupIngredients.forEach((ing) => {
        const globalIdx = allIngredients.findIndex((i) => i.id === ing.id);
        if (isFullyChecked) {
          newSet.delete(globalIdx);
        } else {
          newSet.add(globalIdx);
        }
      });
      return newSet;
    });
  };

  const handleCreateRecipe = () => {
    if (onCreateRecipe && meal) {
      onCreateRecipe(meal);
      onOpenChange(false);
    }
  };

  // Pour les recettes supprimées, utiliser directement deletedRecipe
  const fullRecipe = isDeletedMode ? deletedRecipe : (recipe || meal?.recipe);

  // Données du meal ou de la recette supprimée
  const displayData = isDeletedMode ? {
    name: deletedRecipe.name,
    prepTime: deletedRecipe.preparationTime,
    cookTime: deletedRecipe.cookingTime,
    servings: deletedRecipe.servings,
    calories: 0,
    recipeId: deletedRecipe.id,
    imageUrl: deletedRecipe.imageUrl,
    ingredients: deletedRecipe.ingredients,
    steps: deletedRecipe.steps,
  } : meal;

  // Vérifier plusieurs sources pour l'image
  const recipeImageUrl = fullRecipe?.imageUrl || displayData?.recipe?.imageUrl || displayData?.imageUrl;

  // Labels de coût (comme dans recipe-detail.tsx)
  const costLabels: Record<string, { label: string; emoji: string; color: string }> = {
    CHEAP: { label: "Économique", emoji: "€", color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40" },
    MEDIUM: { label: "Moyen", emoji: "€€", color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40" },
    EXPENSIVE: { label: "Cher", emoji: "€€€", color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40" },
  };

  // Ne rien afficher jusqu'à ce que le composant soit monté (évite les problèmes de hydration)
  if (!isMounted) {
    return null;
  }

  const RecipeContent = () => (
    <div className="space-y-4 pb-6">
      {/* Stats Bar - DESKTOP ONLY - Même design que recipe details page */}
      <div className="hidden md:block px-4">
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3 p-3 md:p-4 rounded-xl bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Préparation
              </p>
              <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">
                {formatTime(displayData?.prepTime)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/40">
              <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                    Cuisson
                  </p>
                  <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {formatTime(displayData?.cookTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                    Personnes
                  </p>
                  <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {displayData?.servings} pers.
                  </p>
                </div>
              </div>
              {fullRecipe?.costEstimate && costLabels[fullRecipe.costEstimate] && (
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-full ${costLabels[fullRecipe.costEstimate].color.split(' ').slice(1).join(' ')}`}>
                    <Coins className={`h-3.5 w-3.5 md:h-4 md:w-4 ${costLabels[fullRecipe.costEstimate].color.split(' ')[0]} ${costLabels[fullRecipe.costEstimate].color.split(' ')[1] || ''}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                      Coût
                    </p>
                    <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {costLabels[fullRecipe.costEstimate].emoji} {costLabels[fullRecipe.costEstimate].label}
                    </p>
                  </div>
                </div>
              )}
              {(displayData?.calories ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/40">
                    <Flame className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                      Calories
                    </p>
                    <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {displayData?.calories} kcal/pers.
                    </p>
                  </div>
                </div>
              )}
              {(fullRecipe?.rating ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                    <Star className="h-3.5 w-3.5 md:h-4 md:w-4 text-yellow-600 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                      Note
                    </p>
                    <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">
                  {fullRecipe.rating.toFixed(1)}/10
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Header - MOBILE ONLY - une seule row sur mobile avec couleurs distinctives */}
      <div className="flex md:hidden items-center gap-2 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0 border border-blue-200 dark:border-blue-800">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
              {displayData?.prepTime + displayData?.cookTime}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">min</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex-shrink-0 border border-purple-200 dark:border-purple-800">
          <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">
              {displayData?.servings}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">pers.</p>
          </div>
        </div>
        {(displayData?.calories ?? 0) > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex-shrink-0 border border-orange-200 dark:border-orange-800">
            <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <div className="flex items-center gap-1">
              <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">
                {displayData?.calories}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">kcal</p>
            </div>
          </div>
        )}
      </div>

      {/* Info recette supprimée */}
      {isDeletedMode && deletedRecipe?.deletedAt && (
        <div className="mx-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Supprimée le {new Date(deletedRecipe.deletedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </div>
      )}

      {/* Bouton restaurer pour les recettes supprimées */}
      {isDeletedMode && onRestore && (
        <div className="px-4">
          <Button
            onClick={onRestore}
            disabled={isRestoring}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Restaurer cette recette
          </Button>
        </div>
      )}

      {/* Bouton voir recette complète */}
      {!isDeletedMode && displayData?.recipeId && (
        <div className="px-4">
          <Button asChild variant="outline" size="sm" className="w-full gap-2">
            <Link href={`/recipes/${displayData.recipeId}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
              Voir la recette complète
            </Link>
          </Button>
        </div>
      )}

      {/* Bouton créer recette pour les recettes générées par IA */}
      {!isDeletedMode && !displayData?.recipeId && onCreateRecipe && (
        <div className="px-4">
          <Button
            onClick={handleCreateRecipe}
            variant="default"
            size="sm"
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Créer cette recette dans mes recettes
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 px-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ingrédients */}
          <Card className="mx-4 border-emerald-100 dark:border-emerald-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <span className="text-lg">🥗</span>
                Ingrédients
              </CardTitle>
              {checkedIngredients.size > 0 && (
                <p className="text-sm text-emerald-600">
                  {checkedIngredients.size} / {fullRecipe?.ingredients?.length || displayData?.ingredients?.length || 0} cochés
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {fullRecipe?.ingredientGroups?.length > 0 ? (
                fullRecipe.ingredientGroups.map((group: any, groupIdx: number) => {
                  const isGroupChecked = isGroupFullyChecked(group.ingredients, fullRecipe.ingredients);
                  return (
                    <div key={groupIdx} className="space-y-2">
                      {group.name && (
                        <>
                          <div
                            onClick={() => toggleGroup(group.ingredients, fullRecipe.ingredients)}
                            className="flex items-center gap-2 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded px-1 py-1 transition-colors"
                          >
                            <Checkbox
                              checked={isGroupChecked}
                              onCheckedChange={() => toggleGroup(group.ingredients, fullRecipe.ingredients)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <h4 className={`font-semibold text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex-1 ${isGroupChecked ? 'line-through opacity-60' : ''}`}>
                              {group.name}
                            </h4>
                          </div>
                          <hr className="border-t border-emerald-200 dark:border-emerald-800 pb-1" />
                        </>
                      )}
                    <div className="space-y-1.5">
                      {group.ingredients.map((ing: any) => {
                        const globalIdx = fullRecipe.ingredients.findIndex((i: any) => i.id === ing.id);
                        const isChecked = checkedIngredients.has(globalIdx);
                        return (
                          <label
                            key={ing.id}
                            className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                              isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleIngredient(globalIdx)}
                              className="h-5 w-5 mt-0.5 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <span className={`flex-1 text-sm ${isChecked ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"}`}>
                              {ing.quantity && ing.unit ? (
                                <>
                                  {ing.quantity} {ing.unit} {ing.name}
                                </>
                              ) : (
                                ing.name
                              )}
                            </span>
                          </label>
                        );
                      })}
                      </div>
                    </div>
                  );
                })
              ) : fullRecipe?.ingredients?.length > 0 ? (
                <div className="space-y-1.5">
                  {fullRecipe.ingredients.map((ing: any, idx: number) => {
                    const isChecked = checkedIngredients.has(idx);
                    return (
                      <label
                        key={idx}
                        className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                          isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleIngredient(idx)}
                          className="h-5 w-5 mt-0.5 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <span className={`flex-1 text-sm ${isChecked ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"}`}>
                          {ing.quantity && ing.unit ? (
                            <>
                              {ing.quantity} {ing.unit} {ing.name}
                            </>
                          ) : (
                            ing.name
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(displayData?.ingredients) && displayData?.ingredients.length > 0 ? displayData?.ingredients.map((ing: any, idx: number) => {
                    // Vérifier si c'est un groupe d'ingrédients
                    if (typeof ing === 'object' && ing.name && Array.isArray(ing.items)) {
                      // Format groupé: {name: "Farce", items: [...]}
                      return (
                        <div key={idx} className="space-y-2">
                          <h4 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                            {ing.name}
                          </h4>
                          <hr className="border-t border-emerald-200 dark:border-emerald-800 pb-1" />
                          <div className="space-y-1.5 pl-2">
                            {ing.items.map((item: string, itemIdx: number) => {
                              const itemKey = `${idx}-${itemIdx}`;
                              const isChecked = checkedIngredients.has(itemKey as any);
                              return (
                                <label
                                  key={itemKey}
                                  className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                                    isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => toggleIngredient(itemKey as any)}
                                    className="h-5 w-5 mt-0.5 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                  />
                                  <span className={`flex-1 text-sm ${isChecked ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"}`}>
                                    {item}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else {
                      // Format simple: string
                      const ingredientStr = typeof ing === 'string' ? ing : String(ing);
                      const isChecked = checkedIngredients.has(idx);
                      return (
                        <label
                          key={idx}
                          className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                            isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleIngredient(idx)}
                            className="h-5 w-5 mt-0.5 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <span className={`flex-1 text-sm ${isChecked ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"}`}>
                            {ingredientStr}
                          </span>
                        </label>
                      );
                    }
                  }) : (
                    <p className="text-sm text-stone-500 text-center py-4">
                      Aucun ingrédient disponible
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Étapes de préparation */}
          <Card className="mx-4 border-emerald-100 dark:border-emerald-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <span className="text-lg">👨‍🍳</span>
                Préparation
              </CardTitle>
              <p className="text-sm text-stone-500 mt-1">
                Cliquez pour cocher une étape
              </p>
            </CardHeader>
            <CardContent className="space-y-2.5 pb-4">
              {fullRecipe?.steps?.length > 0 ? (
                fullRecipe.steps.map((step: any, index: number) => {
                  const isCompleted = completedSteps.has(index);

                  return (
                    <div
                      key={index}
                      onClick={() => toggleStep(index)}
                      className={`cursor-pointer select-none transition-all duration-200 ${
                        isCompleted ? "opacity-70" : ""
                      }`}
                    >
                      <div className={`rounded-lg p-3 border-2 transition-all ${
                        isCompleted
                          ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                          : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                      }`}>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                                isCompleted
                                  ? "bg-emerald-500"
                                  : "bg-orange-500"
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="h-4 w-4 text-white" />
                              ) : (
                                <span className="text-white">{step.order}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className={`text-sm leading-relaxed text-left ${
                              isCompleted ? "text-stone-500 dark:text-stone-400" : "text-stone-700 dark:text-stone-200"
                            }`}>
                              {step.text.split('\n').map((line: string, lineIndex: number) => {
                                const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
                                const trimmedLine = line.trim();
                                const isBulletPoint = trimmedLine.startsWith('-');

                                if (!isBulletPoint) {
                                  return <span key={lineIndex} className="block">{line}</span>;
                                }

                                const indentLevel = Math.floor(leadingSpaces / 2);
                                const textWithoutBullet = trimmedLine.substring(1).trim();

                                return (
                                  <div
                                    key={lineIndex}
                                    className="flex gap-2 items-start"
                                    style={{ marginLeft: `${indentLevel}rem` }}
                                  >
                                    <span className="text-orange-500 dark:text-orange-400 font-bold flex-shrink-0 mt-[0.15rem]">•</span>
                                    <span className="flex-1">{textWithoutBullet}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="space-y-2.5">
                  {Array.isArray(displayData?.steps) && displayData?.steps.map((step: string, index: number) => {
                    const isCompleted = completedSteps.has(index);

                    return (
                      <div
                        key={index}
                        onClick={() => toggleStep(index)}
                        className={`cursor-pointer select-none transition-all duration-200 ${
                          isCompleted ? "opacity-70" : ""
                        }`}
                      >
                        <div className={`rounded-lg p-3 border-2 transition-all ${
                          isCompleted
                            ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                            : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                        }`}>
                          <div className="flex gap-3">
                            <div className="flex-shrink-0">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                                  isCompleted
                                    ? "bg-emerald-500"
                                    : "bg-orange-500"
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="h-4 w-4 text-white" />
                                ) : (
                                  <span className="text-white">{index + 1}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className={`text-sm leading-relaxed ${
                                isCompleted ? "text-stone-500 dark:text-stone-400" : "text-stone-700 dark:text-stone-200"
                              }`}>
                                {step}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  // Ne rien afficher jusqu'à ce que le composant soit monté (évite les problèmes d'hydration)
  if (!isMounted) {
    return null;
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-6xl max-h-[90vh] overflow-y-auto p-0 sm:!max-w-[85vw] lg:!max-w-6xl">
          <VisuallyHidden>
            <DialogTitle>{displayData?.name}</DialogTitle>
          </VisuallyHidden>

          {/* Hero: Image 80% + Stats 20% */}
          <div className="flex gap-4 h-[354px] p-4">
            {/* Image 80% */}
            {recipeImageUrl ? (
              <div className="relative w-[80%] overflow-hidden rounded-xl bg-stone-900">
                <Image
                  src={recipeImageUrl}
                  alt={displayData?.name}
                  fill
                  className="object-cover opacity-80"
                  sizes="80vw"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Attribution Unsplash si données disponibles */}
                {(() => {
                  try {
                    const unsplashData = displayData?.unsplashData ? JSON.parse(displayData?.unsplashData) : null;
                    if (unsplashData) {
                      return (
                        <div className="absolute top-2 right-2 z-10">
                          <UnsplashAttribution
                            photographerName={unsplashData.photographerName}
                            photographerUsername={unsplashData.photographerUsername}
                            photographerUrl={unsplashData.photographerUrl}
                          />
                        </div>
                      );
                    }
                  } catch {
                    // Ignore parsing errors
                  }
                  return null;
                })()}

                <div className="absolute bottom-3 left-4 right-4">
                  {isDeletedMode && (
                    <span className="inline-block px-2 py-1 mb-2 text-xs font-medium bg-red-500/90 text-white rounded">
                      Recette supprimée
                    </span>
                  )}
                  <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                    {displayData?.name}
                  </h2>
                </div>
              </div>
            ) : (
              <div className="relative w-[80%] flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50/50 dark:from-stone-800 dark:via-stone-850 dark:to-stone-900 border border-stone-200 dark:border-stone-700 overflow-hidden">
                {/* Pattern décoratif subtil */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }} />
                {/* Icône chef */}
                <div className="text-6xl mb-4 opacity-20">👨‍🍳</div>
                {/* Badge recette supprimée */}
                {isDeletedMode && (
                  <span className="inline-block px-2 py-1 mb-2 text-xs font-medium bg-red-500/90 text-white rounded">
                    Recette supprimée
                  </span>
                )}
                {/* Titre élégant */}
                <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100 text-center px-8 leading-tight">
                  {displayData?.name}
                </h2>
                {/* Ligne décorative */}
                <div className="mt-4 w-24 h-1 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
              </div>
            )}

            {/* Stats 20% - 6 rows verticales */}
            <div className="w-[20%] flex flex-col gap-2">
              {/* Stats - 6 rows verticales */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                {/* Row 1: Préparation */}
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Préparation</p>
                    <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">{formatTime(displayData?.prepTime)}</p>
                  </div>
                </div>

                {/* Row 2: Cuisson */}
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/40 flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Cuisson</p>
                    <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">{formatTime(displayData?.cookTime)}</p>
                  </div>
                </div>

                {/* Row 3: Personnes */}
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0">
                    <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Personnes</p>
                    <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">{displayData?.servings} pers.</p>
                  </div>
                </div>

                {/* Row 4: Coût */}
                {fullRecipe?.costEstimate && costLabels[fullRecipe.costEstimate] && (
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1.5 rounded-full flex-shrink-0 ${costLabels[fullRecipe.costEstimate].color.split(' ').slice(1).join(' ')}`}>
                      <Coins className={`h-3.5 w-3.5 ${costLabels[fullRecipe.costEstimate].color.split(' ')[0]}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Coût</p>
                      <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">{costLabels[fullRecipe.costEstimate].emoji} {costLabels[fullRecipe.costEstimate].label}</p>
                    </div>
                  </div>
                )}

                {/* Row 5: Calories */}
                {(displayData?.calories ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex-shrink-0">
                      <Flame className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Calories</p>
                      <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">{displayData?.calories} kcal/pers.</p>
                    </div>
                  </div>
                )}

                {/* Row 6: Note */}
                {(fullRecipe?.rating ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="p-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex-shrink-0">
                      <Star className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 fill-yellow-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Note</p>
                      <p className="text-[15px] font-semibold text-stone-900 dark:text-stone-100 truncate">{fullRecipe.rating.toFixed(1)}/10</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions: Button Recette complète */}
              {displayData?.recipeId && (
                <Button asChild variant="outline" size="sm" className="gap-2 w-full text-xs h-8">
                  <Link href={`/recipes/${fullRecipe?.slug || displayData?.recipeId}`} target="_blank">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">Recette complète</span>
                  </Link>
                </Button>
              )}

              {/* Bouton créer recette pour les recettes générées par IA */}
              {!displayData?.recipeId && onCreateRecipe && (
                <Button
                  onClick={handleCreateRecipe}
                  size="sm"
                  className="gap-2 w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-3 w-3" />
                  <span className="truncate">Créer cette recette</span>
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-4 space-y-3">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-5">
                {/* Ingrédients - 2 colonnes */}
                <Card className="lg:col-span-2 border-emerald-100 dark:border-emerald-900/50">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-xl">🥗</span>
                      Ingrédients
                    </CardTitle>
                    {checkedIngredients.size > 0 && (
                      <p className="text-sm text-emerald-600">
                        {checkedIngredients.size} / {fullRecipe?.ingredients?.length || displayData?.ingredients?.length || 0} cochés
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 pb-3 px-4">
                    {fullRecipe?.ingredientGroups?.length > 0 ? (
                      fullRecipe.ingredientGroups.map((group: any, groupIdx: number) => {
                        const isGroupChecked = isGroupFullyChecked(group.ingredients, fullRecipe.ingredients);
                        return (
                          <div key={groupIdx} className="space-y-1.5">
                            {group.name && (
                              <>
                                <div
                                  onClick={() => toggleGroup(group.ingredients, fullRecipe.ingredients)}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded px-1 py-1 transition-colors"
                                >
                                  <Checkbox
                                    checked={isGroupChecked}
                                    onCheckedChange={() => toggleGroup(group.ingredients, fullRecipe.ingredients)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4 w-4 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                  />
                                  <h4 className={`font-semibold text-base text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex-1 ${isGroupChecked ? 'line-through opacity-60' : ''}`}>
                                    {group.name}
                                  </h4>
                                </div>
                                <hr className="border-t border-emerald-200 dark:border-emerald-800 mb-2" />
                              </>
                            )}
                          <div className="space-y-1">
                            {group.ingredients.map((ing: any) => {
                              const globalIdx = fullRecipe.ingredients.findIndex((i: any) => i.id === ing.id);
                              const isChecked = checkedIngredients.has(globalIdx);
                              return (
                                <label
                                  key={ing.id}
                                  className={`flex items-start gap-2 p-2.5 rounded cursor-pointer transition-all text-base ${
                                    isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => toggleIngredient(globalIdx)}
                                    className="h-5 w-5 mt-0.5 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                  />
                                  <span className={`flex-1 ${isChecked ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"}`}>
                                    {ing.quantity && ing.unit ? (
                                      <>
                                        {ing.quantity} {ing.unit} {ing.name}
                                      </>
                                    ) : (
                                      ing.name
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          </div>
                        );
                      })
                    ) : fullRecipe?.ingredients?.length > 0 ? (
                      <div className="space-y-1">
                        {fullRecipe.ingredients.map((ing: any, idx: number) => {
                          const isChecked = checkedIngredients.has(idx);
                          return (
                            <label
                              key={idx}
                              className={`flex items-start gap-2 p-2.5 rounded cursor-pointer transition-all text-base ${
                                isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleIngredient(idx)}
                                className="h-5 w-5 mt-0.5 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              />
                              <span className={`flex-1 ${isChecked ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"}`}>
                                {ing.quantity && ing.unit ? (
                                  <>
                                    {ing.quantity} {ing.unit} {ing.name}
                                  </>
                                ) : (
                                  ing.name
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {Array.isArray(displayData?.ingredients) && displayData?.ingredients.length > 0 ? displayData?.ingredients.map((ing: any, idx: number) => {
                          // Vérifier si c'est un groupe d'ingrédients
                          if (typeof ing === 'object' && ing.name && Array.isArray(ing.items)) {
                            // Format groupé: {name: "Farce", items: [...]}
                            return (
                              <div key={idx} className="space-y-2 mb-4">
                                <h4 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                  {ing.name}
                                </h4>
                                <hr className="border-t border-emerald-200 dark:border-emerald-800 pb-1" />
                                <div className="space-y-1 pl-2">
                                  {ing.items.map((item: string, itemIdx: number) => {
                                    const itemKey = `${idx}-${itemIdx}`;
                                    const isChecked = checkedIngredients.has(itemKey as any);
                                    return (
                                      <label
                                        key={itemKey}
                                        className={`flex items-start gap-2 p-2.5 rounded cursor-pointer transition-all text-base ${
                                          isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                        }`}
                                      >
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={() => toggleIngredient(itemKey as any)}
                                          className="h-5 w-5 mt-0.5 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                        />
                                        <span className={`flex-1 ${isChecked ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"}`}>
                                          {item}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          } else {
                            // Format simple: string
                            const ingredientStr = typeof ing === 'string' ? ing : String(ing);
                            const isChecked = checkedIngredients.has(idx);
                            return (
                              <label
                                key={idx}
                                className={`flex items-start gap-2 p-2.5 rounded cursor-pointer transition-all text-base ${
                                  isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleIngredient(idx)}
                                  className="h-5 w-5 mt-0.5 flex-shrink-0 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                                <span className={`flex-1 ${isChecked ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"}`}>
                                  {ingredientStr}
                                </span>
                              </label>
                            );
                          }
                        }) : (
                          <p className="text-sm text-stone-500 text-center py-4">
                            Aucun ingrédient disponible
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Étapes - 3 colonnes */}
                <Card className="lg:col-span-3 border-emerald-100 dark:border-emerald-900/50 pb-3">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-xl">👨‍🍳</span>
                      Préparation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2 px-4">
                    <div className="space-y-2.5">
                      {fullRecipe?.steps?.length > 0 ? (
                        fullRecipe.steps.map((step: any, index: number) => {
                          const isCompleted = completedSteps.has(index);
                          const isLastStep = index === fullRecipe.steps.length - 1;

                          return (
                            <div key={index} className="relative">
                              {!isLastStep && (
                                <div className="absolute left-4 top-11 w-0.5 h-[calc(100%+0.5rem)] bg-gradient-to-b from-stone-200 to-stone-100 dark:from-stone-700 dark:to-stone-800" />
                              )}

                              <div
                                onClick={() => toggleStep(index)}
                                className={`group relative cursor-pointer select-none transition-all duration-300 ${
                                  isCompleted ? "opacity-70 hover:opacity-80" : "hover:shadow-md hover:-translate-y-0.5"
                                }`}
                              >
                                <div className={`rounded-lg p-3.5 border-2 transition-all duration-300 ${
                                  isCompleted
                                    ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                                    : "bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-900 border-stone-200 dark:border-stone-700 hover:border-emerald-300 dark:hover:border-emerald-700"
                                }`}>
                                  <div className="flex gap-3">
                                    <div className="flex-shrink-0">
                                      <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-lg transition-all duration-300 ${
                                          isCompleted
                                            ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                                            : "bg-gradient-to-br from-orange-500 to-orange-600"
                                        }`}
                                      >
                                        {isCompleted ? (
                                          <Check className="h-4 w-4 text-white" />
                                        ) : (
                                          <span className="text-white">{step.order}</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className={`text-base leading-relaxed text-left transition-all duration-300 ${
                                        isCompleted ? "text-stone-500 dark:text-stone-400" : "text-stone-700 dark:text-stone-200"
                                      }`}>
                                        {step.text.split('\n').map((line: string, lineIndex: number) => {
                                          const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
                                          const trimmedLine = line.trim();
                                          const isBulletPoint = trimmedLine.startsWith('-');

                                          if (!isBulletPoint) {
                                            return <span key={lineIndex} className="block">{line}</span>;
                                          }

                                          const indentLevel = Math.floor(leadingSpaces / 2);
                                          const textWithoutBullet = trimmedLine.substring(1).trim();

                                          return (
                                            <div
                                              key={lineIndex}
                                              className="flex gap-2 items-start"
                                              style={{ marginLeft: `${indentLevel}rem` }}
                                            >
                                              <span className="text-orange-500 dark:text-orange-400 font-bold flex-shrink-0 mt-[0.15rem]">•</span>
                                              <span className="flex-1">{textWithoutBullet}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="space-y-2.5">
                          {Array.isArray(displayData?.steps) && displayData?.steps.map((step: string, index: number) => {
                            const isCompleted = completedSteps.has(index);

                            return (
                              <div
                                key={index}
                                onClick={() => toggleStep(index)}
                                className={`cursor-pointer select-none transition-all duration-200 ${
                                  isCompleted ? "opacity-70" : ""
                                }`}
                              >
                                <div className={`rounded-lg p-3.5 border-2 transition-all ${
                                  isCompleted
                                    ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                                    : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                                }`}>
                                  <div className="flex gap-3">
                                    <div className="flex-shrink-0">
                                      <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                          isCompleted
                                            ? "bg-emerald-500"
                                            : "bg-orange-500"
                                        }`}
                                      >
                                        {isCompleted ? (
                                          <Check className="h-4 w-4 text-white" />
                                        ) : (
                                          <span className="text-white">{index + 1}</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className={`text-base leading-relaxed ${
                                        isCompleted ? "text-stone-500 dark:text-stone-400" : "text-stone-700 dark:text-stone-200"
                                      }`}>
                                        {step}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0 overflow-y-auto rounded-t-3xl">
        <VisuallyHidden>
          <SheetTitle>{displayData?.name}</SheetTitle>
        </VisuallyHidden>

        {/* Bouton de fermeture visible */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 flex items-center justify-center h-8 w-8 rounded-full bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-stone-800 transition-colors border border-stone-200 dark:border-stone-700"
          aria-label="Fermer"
        >
          <X className="h-4 w-4 text-stone-700 dark:text-stone-200" />
        </button>

        {/* Toujours afficher le nom de la recette en premier */}
        {recipeImageUrl ? (
          <div className="relative w-full overflow-hidden rounded-t-3xl" style={{ minHeight: '220px', height: '220px' }}>
            <Image
              src={recipeImageUrl}
              alt={displayData?.name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Attribution Unsplash si données disponibles */}
            {(() => {
              try {
                const unsplashData = displayData?.unsplashData ? JSON.parse(displayData?.unsplashData) : null;
                if (unsplashData) {
                  return (
                    <div className="absolute top-2 right-2 z-10">
                      <UnsplashAttribution
                        photographerName={unsplashData.photographerName}
                        photographerUsername={unsplashData.photographerUsername}
                        photographerUrl={unsplashData.photographerUrl}
                      />
                    </div>
                  );
                }
              } catch {
                // Ignore parsing errors
              }
              return null;
            })()}

            <div className="absolute bottom-4 left-4 right-12 z-10">
              {isDeletedMode && (
                <span className="inline-block px-2 py-1 mb-2 text-xs font-medium bg-red-500/90 text-white rounded">
                  Recette supprimée
                </span>
              )}
              <h2 className="text-xl font-bold text-white drop-shadow-2xl leading-tight line-clamp-3">
                {displayData?.name}
              </h2>
            </div>
          </div>
        ) : (
          <div className="relative pt-14 px-6 pb-5 rounded-t-3xl bg-gradient-to-br from-stone-50 via-white to-amber-50/30 dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 border-b border-stone-200 dark:border-stone-700 overflow-hidden">
            {/* Pattern décoratif */}
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
            {/* Icône décorative */}
            <div className="absolute top-12 right-4 text-4xl opacity-10">👨‍🍳</div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-white relative z-10 leading-tight pr-8">
              {displayData?.name}
            </h2>
            {/* Ligne décorative */}
            <div className="mt-3 w-16 h-1 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
          </div>
        )}

        <RecipeContent />
      </SheetContent>
    </Sheet>
  );
}
