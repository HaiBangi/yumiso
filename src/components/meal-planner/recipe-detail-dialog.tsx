"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Users, Flame, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface RecipeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: any;
}

export function RecipeDetailDialog({ open, onOpenChange, meal }: RecipeDetailDialogProps) {
  const [recipe, setRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

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

  const fullRecipe = recipe || meal.recipe;
  const hasImage = fullRecipe?.imageUrl;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!max-w-[50vw] !w-[50vw] max-h-[95vh] overflow-y-auto p-0 scrollbar-thin" 
        style={{ 
          maxWidth: '50vw', 
          width: '50vw',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(120 113 108 / 0.5) transparent'
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>{meal.name}</DialogTitle>
        </VisuallyHidden>
        <div className="relative">
          {/* Image avec overlay pour titre et infos */}
          {hasImage ? (
            <div className="relative w-full h-[40vh] min-h-[300px]">
              <Image
                src={fullRecipe.imageUrl}
                alt={meal.name}
                fill
                className="object-cover"
                sizes="95vw"
                priority
              />
              {/* Gradient overlay pour lisibilité */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
              
              {/* Contenu overlay */}
              <div className="absolute inset-0 flex flex-col justify-between p-6">
                {/* Titre et infos en bas */}
                <div className="space-y-4 mt-auto">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-serif drop-shadow-2xl">
                    {meal.name}
                  </h2>
                  
                  {/* Info Row sur l'image */}
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2">
                        <Clock className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-xs text-stone-500">Temps total</p>
                          <p className="font-semibold text-stone-900">{meal.prepTime + meal.cookTime} min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2">
                        <Users className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-xs text-stone-500">Portions</p>
                          <p className="font-semibold text-stone-900">{meal.servings} pers.</p>
                        </div>
                      </div>
                      {meal.calories && (
                        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2">
                          <Flame className="h-5 w-5 text-emerald-600" />
                          <div>
                            <p className="text-xs text-stone-500">Calories</p>
                            <p className="font-semibold text-stone-900">{meal.calories} kcal</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Bouton voir la recette en bas à droite */}
                    {meal.recipeId && (
                      <Button asChild variant="secondary" size="sm" className="gap-2 bg-white/90 hover:bg-white backdrop-blur-sm">
                        <Link href={`/recipes/${meal.recipeId}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                          <span className="hidden sm:inline">Voir la recette complète</span>
                          <span className="sm:hidden">Recette</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Pas d'image : header classique
            <DialogHeader className="p-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <DialogTitle className="text-3xl sm:text-4xl font-bold flex-1 font-serif">
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
              
              {/* Info Row si pas d'image */}
              <div className="flex flex-wrap gap-4 sm:gap-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 mt-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white dark:bg-stone-800 rounded-lg">
                    <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Temps total</p>
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{meal.prepTime + meal.cookTime} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white dark:bg-stone-800 rounded-lg">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Portions</p>
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{meal.servings} pers.</p>
                  </div>
                </div>
                {meal.calories && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-stone-800 rounded-lg">
                      <Flame className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">Calories</p>
                      <p className="font-semibold text-stone-900 dark:text-stone-100">{meal.calories} kcal</p>
                    </div>
                  </div>
                )}
              </div>
            </DialogHeader>
          )}

        {isLoading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Ingrédients - 2 colonnes */}
              <Card className="lg:col-span-2 border border-emerald-100 dark:border-emerald-900/50 shadow-sm bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2 text-stone-900 dark:text-stone-100">
                    <span className="text-xl sm:text-2xl">🥗</span>
                    Ingrédients
                  </CardTitle>
                  {checkedIngredients.size > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {checkedIngredients.size} / {fullRecipe?.ingredients?.length || meal.ingredients?.length || 0} cochés
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {fullRecipe?.ingredientGroups?.length > 0 ? (
                    fullRecipe.ingredientGroups.map((group: any, groupIdx: number) => (
                      <div key={groupIdx} className="space-y-2">
                        {group.name && (
                          <h4 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wide border-b border-emerald-200 dark:border-emerald-800 pb-1">
                            {group.name}
                          </h4>
                        )}
                        <div className="space-y-2">
                          {group.ingredients.map((ing: any) => {
                            const globalIdx = fullRecipe.ingredients.findIndex((i: any) => i.id === ing.id);
                            const isChecked = checkedIngredients.has(globalIdx);
                            return (
                              <label
                                key={ing.id}
                                className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${
                                  isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleIngredient(globalIdx)}
                                  className="h-5 w-5 mt-0.5 border-emerald-300 dark:border-emerald-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 cursor-pointer flex-shrink-0"
                                />
                                <span className={`flex-1 text-sm ${isChecked ? "line-through text-stone-400" : "text-stone-700 dark:text-stone-200"}`}>
                                  {ing.quantity && ing.unit ? (
                                    <>
                                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                        {ing.quantity} {ing.unit}
                                      </span>
                                      {" "}{ing.name}
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
                    ))
                  ) : fullRecipe?.ingredients?.length > 0 ? (
                    <div className="space-y-2">
                      {fullRecipe.ingredients.map((ing: any, idx: number) => {
                        const isChecked = checkedIngredients.has(idx);
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${
                              isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleIngredient(idx)}
                              className="h-5 w-5 mt-0.5 border-emerald-300 dark:border-emerald-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 cursor-pointer flex-shrink-0"
                            />
                            <span className={`flex-1 text-sm ${isChecked ? "line-through text-stone-400" : "text-stone-700 dark:text-stone-200"}`}>
                              {ing.quantity && ing.unit ? (
                                <>
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    {ing.quantity} {ing.unit}
                                  </span>
                                  {" "}{ing.name}
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
                    <div className="space-y-2">
                      {Array.isArray(meal.ingredients) && meal.ingredients.map((ing: string, idx: number) => {
                        const isChecked = checkedIngredients.has(idx);
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${
                              isChecked ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleIngredient(idx)}
                              className="h-5 w-5 mt-0.5 border-emerald-300 dark:border-emerald-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 cursor-pointer flex-shrink-0"
                            />
                            <span className={`flex-1 text-sm ${isChecked ? "line-through text-stone-400" : "text-stone-700 dark:text-stone-200"}`}>
                              {ing}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Étapes - 3 colonnes */}
              <Card className="lg:col-span-3 border border-emerald-100 dark:border-emerald-900/50 shadow-sm bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm pb-4">
                <CardHeader className="pb-4">
                  <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2 text-stone-900 dark:text-stone-100">
                    <span className="text-xl sm:text-2xl">👨‍🍳</span>
                    Préparation
                  </CardTitle>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Cliquez sur une étape pour la marquer comme terminée
                  </p>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-3">
                    {fullRecipe?.steps?.length > 0 ? (
                      fullRecipe.steps.map((step: any, index: number) => {
                        const isCompleted = completedSteps.has(index);
                        const isLastStep = index === fullRecipe.steps.length - 1;
                        
                        return (
                          <div key={index} className="relative">
                            {!isLastStep && (
                              <div className="absolute left-5 sm:left-6 top-12 sm:top-14 w-0.5 h-[calc(100%+1rem)] bg-gradient-to-b from-stone-200 to-stone-100 dark:from-stone-700 dark:to-stone-800" />
                            )}
                            
                            <div
                              onClick={() => toggleStep(index)}
                              className={`group relative cursor-pointer select-none transition-all duration-300 ${
                                isCompleted ? "opacity-70 hover:opacity-80" : "hover:shadow-md hover:-translate-y-0.5"
                              }`}
                            >
                              <div className={`rounded-xl p-3 sm:p-4 border-2 transition-all duration-300 ${
                                isCompleted
                                  ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                                  : "bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-900 border-stone-200 dark:border-stone-700 hover:border-emerald-300 dark:hover:border-emerald-700"
                              }`}>
                                <div className="flex gap-4">
                                  <div className="flex-shrink-0">
                                    <div
                                      className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-bold shadow-lg transition-all duration-300 ${
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
                                    <div className={`text-sm sm:text-base leading-relaxed text-justify transition-all duration-300 ${
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
                                        const content = trimmedLine.substring(1).trim();
                                        
                                        return (
                                          <div key={lineIndex} className="flex items-start gap-2" style={{ paddingLeft: `${indentLevel}rem` }}>
                                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                                            <span>{content}</span>
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
                      Array.isArray(meal.steps) && meal.steps.map((step: string, index: number) => {
                        const isCompleted = completedSteps.has(index);
                        const isLastStep = index === meal.steps.length - 1;
                        
                        return (
                          <div key={index} className="relative">
                            {!isLastStep && (
                              <div className="absolute left-5 top-12 w-0.5 h-[calc(100%+1rem)] bg-gradient-to-b from-stone-200 to-stone-100 dark:from-stone-700 dark:to-stone-800" />
                            )}
                            
                            <div
                              onClick={() => toggleStep(index)}
                              className={`group relative cursor-pointer select-none transition-all duration-300 ${
                                isCompleted ? "opacity-70 hover:opacity-80" : "hover:shadow-md hover:-translate-y-0.5"
                              }`}
                            >
                              <div className={`rounded-xl p-3 sm:p-4 border-2 transition-all duration-300 ${
                                isCompleted
                                  ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                                  : "bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-900 border-stone-200 dark:border-stone-700 hover:border-emerald-300"
                              }`}>
                                <div className="flex gap-4">
                                  <div className="flex-shrink-0">
                                    <div
                                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-lg transition-all ${
                                        isCompleted
                                          ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                                          : "bg-gradient-to-br from-orange-500 to-orange-600"
                                      }`}
                                    >
                                      {isCompleted ? (
                                        <Check className="h-4 w-4 text-white" />
                                      ) : (
                                        <span className="text-white">{index + 1}</span>
                                      )}
                                    </div>
                                  </div>

                                  <p className={`flex-1 text-sm leading-relaxed text-justify ${
                                    isCompleted ? "text-stone-500 dark:text-stone-400" : "text-stone-700 dark:text-stone-200"
                                  }`}>
                                    {step}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
