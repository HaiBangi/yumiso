"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {Trash2, Edit2, Eye, Sparkles} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeDetailSheet } from "./recipe-detail-sheet";
import { EditMealDialog } from "./edit-meal-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RecipeForm } from "@/components/recipes/recipe-form";
import Image from "next/image";
import { useRecalculateShoppingList, useDeleteMeal } from "@/hooks/use-meal-planner-query";

// Fonction pour parser un ingrédient complet (ex: "100g de flocons d'avoine")
// Retourne { quantity, unit, name, quantityUnit }
function parseIngredientString(input: string): { quantity: string; unit: string; name: string; quantityUnit: string } {
  if (!input || typeof input !== 'string') {
    return { quantity: "", unit: "", name: "", quantityUnit: "" };
  }
  
  const trimmed = input.trim();
  
  // Pattern pour capturer: "100g de flocons d'avoine", "2 c.à.s de sucre", "1/2 citron", etc.
  // Groupe 1: nombre (entier, décimal, fraction)
  // Groupe 2: unité (g, kg, ml, L, c.à.s, etc.)
  // Groupe 3: connecteur optionnel (de, d', du, des)
  // Groupe 4: nom de l'ingrédient
  const pattern = /^(\d+(?:[.,\/]\d+)?)\s*([a-zA-ZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ.]+)?\s*(?:de\s+|d'|du\s+|des\s+)?(.+)?$/i;
  
  const match = trimmed.match(pattern);
  
  if (match) {
    const quantity = (match[1] || "").replace(",", ".");
    const unit = (match[2] || "").trim();
    const name = (match[3] || "").trim();
    
    // Si pas de nom mais une unité qui ressemble à un nom (ex: "2 oeufs")
    if (!name && unit && !isUnit(unit)) {
      return {
        quantity,
        unit: "",
        name: unit,
        quantityUnit: quantity,
      };
    }
    
    // Si l'unité est vide et le nom commence par un mot qui pourrait être une unité
    if (!unit && name) {
      const unitMatch = name.match(/^([a-zA-ZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ.]+)\s+(?:de\s+|d'|du\s+|des\s+)?(.+)$/i);
      if (unitMatch && isUnit(unitMatch[1])) {
        return {
          quantity,
          unit: unitMatch[1],
          name: unitMatch[2].trim(),
          quantityUnit: quantity ? `${quantity} ${unitMatch[1]}` : unitMatch[1],
        };
      }
    }
    
    return {
      quantity,
      unit,
      name: name || unit, // Si pas de nom, utiliser l'unité comme nom (ex: "2 oeufs")
      quantityUnit: quantity && unit ? `${quantity} ${unit}` : quantity || unit,
    };
  }
  
  // Pas de pattern reconnu, retourner l'input comme nom
  return { quantity: "", unit: "", name: trimmed, quantityUnit: "" };
}

// Vérifier si une chaîne est une unité connue
function isUnit(str: string): boolean {
  const units = [
    'g', 'kg', 'mg', 'l', 'L', 'ml', 'cl', 'dl',
    'c.à.s', 'c.à.c', 'cas', 'cac', 'càs', 'càc',
    'cuillère', 'cuillères', 'tasse', 'tasses',
    'verre', 'verres', 'pincée', 'pincées',
    'gousse', 'gousses', 'tranche', 'tranches',
    'feuille', 'feuilles', 'brin', 'brins',
    'bouquet', 'bouquets', 'paquet', 'paquets',
    'boîte', 'boîtes', 'pot', 'pots',
    'sachet', 'sachets', 'tablette', 'tablettes',
  ];
  return units.some(u => str.toLowerCase() === u.toLowerCase());
}

interface MealCardProps {
  meal: any;
  planId: number;
  onRefresh: () => void;
  canEdit?: boolean;
  showImages?: boolean;
}

export function MealCard({ meal, planId, onRefresh, canEdit = false, showImages = true }: MealCardProps) {
  const router = useRouter();
  const [showDetail, setShowDetail] = useState(false);
  
  const recalculateShoppingList = useRecalculateShoppingList();
  const deleteMeal = useDeleteMeal();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateRecipeForm, setShowCreateRecipeForm] = useState(false);

  // Helper pour extraire la valeur de calories (peut être un nombre ou un objet)
  const getCaloriesValue = (calories: any): number | null => {
    if (typeof calories === 'number') return calories;
    if (typeof calories === 'object' && calories !== null) {
      // Si c'est un objet, essayer d'extraire une valeur numérique
      if ('value' in calories) return Number(calories.value) || null;
      if ('amount' in calories) return Number(calories.amount) || null;
      // Sinon, retourner null
      return null;
    }
    if (typeof calories === 'string') return parseFloat(calories) || null;
    return null;
  };

  const caloriesValue = getCaloriesValue(meal.calories);
  
  // Helper pour obtenir le nombre de vues (depuis la recette liée si disponible)
  const viewsCount = meal.recipe?.viewsCount || null;
  
  // Détecter si c'est une recette générée par IA (pas de recipeId et pas isUserRecipe)
  const isAIGenerated = !meal.recipeId && !meal.isUserRecipe;

  // Fonction pour créer une recette à partir des données IA
  const handleCreateRecipe = (mealData: any) => {
    // Fonction helper pour parser et formater les ingrédients
    const parseIngredients = (ingredients: any[]): any[] => {
      return ingredients.flatMap((ing: any, idx: number) => {
        if (typeof ing === 'object' && ing.name && Array.isArray(ing.items)) {
          // Format groupé - aplatir pour le mode simple
          return ing.items.map((item: string, itemIdx: number) => {
            const parsed = parseIngredientString(item);
            return {
              id: `ing-${idx}-${itemIdx}`,
              name: parsed.name || item,
              quantity: parsed.quantity,
              unit: parsed.unit,
              quantityUnit: parsed.quantityUnit,
            };
          });
        }
        // Format simple string
        const itemStr = typeof ing === 'string' ? ing : String(ing);
        const parsed = parseIngredientString(itemStr);
        return [{
          id: `ing-${idx}`,
          name: parsed.name || itemStr,
          quantity: parsed.quantity,
          unit: parsed.unit,
          quantityUnit: parsed.quantityUnit,
        }];
      });
    };

    // Construire l'objet recette pour le formulaire au format DraftData
    const recipeData = {
      name: mealData.name || "",
      description: "", 
      category: "MAIN_DISH",
      imageUrl: mealData.imageUrl || "",
      videoUrl: "",
      preparationTime: mealData.prepTime?.toString() || "",
      cookingTime: mealData.cookTime?.toString() || "",
      servings: mealData.servings?.toString() || "4",
      caloriesPerServing: mealData.calories?.toString() || "",
      costEstimate: "",
      tags: [] as string[],
      // Convertir les ingrédients avec parsing des quantités
      ingredients: Array.isArray(mealData.ingredients)
        ? parseIngredients(mealData.ingredients)
        : [{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }],
      // Étapes au format StepInput
      steps: Array.isArray(mealData.steps) && mealData.steps.length > 0
        ? mealData.steps.map((step: string, idx: number) => ({
            id: `step-${idx}`,
            text: step,
          }))
        : [{ id: "step-0", text: "" }],
      // Groupes d'ingrédients avec parsing
      useGroups: Array.isArray(mealData.ingredients) && mealData.ingredients.some(
        (ing: any) => typeof ing === 'object' && ing.name && Array.isArray(ing.items)
      ),
      ingredientGroups: Array.isArray(mealData.ingredients)
        ? mealData.ingredients
            .filter((ing: any) => typeof ing === 'object' && ing.name && Array.isArray(ing.items))
            .map((ing: any, idx: number) => ({
              id: `group-${idx}`,
              name: ing.name,
              ingredients: ing.items.map((item: string, itemIdx: number) => {
                const parsed = parseIngredientString(item);
                return {
                  id: `ing-${idx}-${itemIdx}`,
                  name: parsed.name || item,
                  quantity: parsed.quantity,
                  unit: parsed.unit,
                  quantityUnit: parsed.quantityUnit,
                };
              }),
            }))
        : [],
      savedAt: Date.now(),
    };
    
    console.log("📝 Sauvegarde du draft pour création de recette:", recipeData);
    
    // Stocker dans localStorage pour que RecipeForm puisse le récupérer
    localStorage.setItem('yumiso_new_recipe_draft', JSON.stringify(recipeData));
    
    // Ouvrir le formulaire de création directement
    setShowCreateRecipeForm(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    deleteMeal.mutate(meal.id, {
      onSuccess: () => {
        // Recalculer la liste de courses après suppression
        recalculateShoppingList.mutate(meal.weeklyMealPlanId, {
          onSettled: () => {
            // Rafraîchir les données APRÈS le recalcul
            onRefresh();
            setIsDeleting(false);
            setShowDeleteDialog(false);
          },
        });
      },
      onError: (error) => {
        console.error("Erreur lors de la suppression:", error);
        setIsDeleting(false);
        setShowDeleteDialog(false);
      },
    });
  };

  // Trigger Unsplash download quand l'utilisateur "utilise" l'image
  const handleMealClick = async () => {
    // Déclencher le tracking Unsplash si données disponibles
    if (meal.unsplashData) {
      try {
        const unsplashData = JSON.parse(meal.unsplashData);
        if (unsplashData?.downloadLocation) {
          // Ne pas await pour ne pas bloquer l'ouverture du dialog
          fetch("/api/unsplash/track-download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ downloadLocation: unsplashData.downloadLocation }),
          }).catch(err => console.warn("Failed to track Unsplash download:", err));
        }
      } catch {
        // Ignore parsing errors
      }
    }
    setShowDetail(true);
  };

  return (
    <>
      <div
        onClick={handleMealClick}
        className="w-full h-full bg-white dark:bg-stone-800 rounded-lg cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden border border-stone-200 dark:border-stone-700"
      >
        {/* Afficher l'image SEULEMENT si showImages=true ET qu'une image existe */}
        {showImages && (meal.imageUrl || meal.recipe?.imageUrl) ? (
          <div className="relative w-full h-48 lg:h-full overflow-hidden">
            {/* Image en arrière-plan */}
            <div className="absolute inset-0">
              <Image
                src={meal.imageUrl || meal.recipe?.imageUrl}
                alt={meal.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized
              />
            </div>
            
            {/* Gradient overlay pour améliorer la lisibilité */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/60" />
            
            {/* Titre en haut de l'image */}
            <div className="absolute top-0 left-0 right-0 p-3 lg:p-4">
              <div className="flex items-start gap-2">
                <h4 className="flex-1 text-base lg:text-base font-bold text-white line-clamp-2 leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {meal.name}
                </h4>
                {isAIGenerated && (
                  <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-violet-500/90 text-white text-[10px] font-medium rounded-md shadow-lg">
                    <Sparkles className="h-2.5 w-2.5" />
                    IA
                  </span>
                )}
              </div>
            </div>
            
            {/* Boutons et calories en bas */}
            <div className="absolute bottom-0 left-0 right-0 p-2 lg:p-3">
              {canEdit ? (
                <div className="flex items-center justify-between gap-1">
                  <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-orange-300 hover:text-orange-200 hover:bg-orange-400/20 rounded-md drop-shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEditDialog(true);
                      }}
                      title="Modifier"
                    >
                      <Edit2 className="h-3 w-3 stroke-[2.5]" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-300 hover:text-red-200 hover:bg-red-400/20 rounded-md drop-shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                      disabled={isDeleting}
                      title="Supprimer"
                    >
                      <Trash2 className="h-3 w-3 stroke-[2.5]" />
                    </Button>
                  </div>
                  
                  {caloriesValue && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm">🔥</span>
                      <span className="text-sm font-bold text-white drop-shadow-md">{caloriesValue}</span>
                    </div>
                  )}
                </div>
              ) : (
                caloriesValue && (
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">🔥</span>
                      <span className="text-sm font-bold text-white drop-shadow-md">{caloriesValue}</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          // Mode compacte : pas d'image (soit showImages=false, soit pas d'image disponible)
          <div className="relative flex flex-col p-3 lg:p-3 h-full">
            {/* Meal Name avec badge IA */}
            <div className="flex items-start gap-2 mb-2">
              <h4 className="flex-1 text-sm lg:text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-3">
                {meal.name}
              </h4>
              {isAIGenerated && (
                <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-[10px] font-medium rounded-md">
                  <Sparkles className="h-2.5 w-2.5" />
                  IA
                </span>
              )}
            </div>
            
            {/* Actions et Calories */}
            {canEdit ? (
              <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditDialog(true);
                    }}
                    title="Modifier"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    disabled={isDeleting}
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                {caloriesValue && (
                  <div className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400">
                    <span>🔥</span>
                    <span className="font-medium">{caloriesValue} kcal</span>
                  </div>
                )}
              </div>
            ) : (
              (caloriesValue || (viewsCount && viewsCount > 0)) && (
                <div className="mt-auto flex items-center justify-end gap-2 pt-1">
                  {caloriesValue && (
                    <div className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400">
                      <span>🔥</span>
                      <span className="font-medium">{caloriesValue} kcal</span>
                    </div>
                  )}
                  {viewsCount && viewsCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400">
                      <Eye className="h-3 w-3" />
                      <span className="font-medium">{viewsCount.toLocaleString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Recipe Detail Dialog */}
      <RecipeDetailSheet
        open={showDetail}
        onOpenChange={setShowDetail}
        meal={meal}
        onCreateRecipe={handleCreateRecipe}
      />

      {/* Recipe Form pour créer une recette depuis une recette IA */}
      {showCreateRecipeForm && (
        <RecipeForm
          defaultOpen={true}
          hideDraftMessage={true}
          trigger={<span className="hidden" />}
          onSuccess={(recipeId, recipeSlug) => {
            setShowCreateRecipeForm(false);
            // Rediriger vers la recette créée (slug préféré, sinon id)
            router.push(`/recipes/${recipeSlug || recipeId}`);
          }}
          onCancel={() => {
            setShowCreateRecipeForm(false);
          }}
        />
      )}

      {/* Edit Meal Dialog */}
      <EditMealDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        meal={meal}
        onSuccess={onRefresh}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Supprimer ce repas ?"
        description={`Êtes-vous sûr de vouloir supprimer ${meal.name} de votre Planificateur de repas ? Cette action est irréversible.`}
        onConfirm={handleDelete}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isLoading={isDeleting}
        variant="destructive"
      />
    </>
  );
}
