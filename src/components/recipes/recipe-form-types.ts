/**
 * Types, interfaces et constantes pour le formulaire de recette
 */

import type { Recipe } from "@/types/recipe";

// ==================== CONSTANTS ====================

export const NEW_RECIPE_DRAFT_KEY = "yumiso_new_recipe_draft";
export const EDIT_RECIPE_DRAFT_KEY_PREFIX = "yumiso_edit_recipe_draft_";

export const categories = [
  // Plats principaux
  { value: "MAIN_DISH", label: "Plat", emoji: "🍽️" },
  { value: "STARTER", label: "Entrée", emoji: "🥗" },
  { value: "DESSERT", label: "Dessert", emoji: "🍰" },
  { value: "SIDE_DISH", label: "Accompagnement", emoji: "🥔" },

  // Soupes et salades
  { value: "SOUP", label: "Soupe", emoji: "🍲" },
  { value: "SALAD", label: "Salade", emoji: "🥬" },

  // Boissons et collations
  { value: "BEVERAGE", label: "Boisson", emoji: "🍹" },
  { value: "SNACK", label: "En-cas", emoji: "🍿" },
  { value: "APPETIZER", label: "Apéritif", emoji: "🍢" },

  // Petit-déjeuner et brunch
  { value: "BREAKFAST", label: "Petit-déjeuner", emoji: "🥐" },
  { value: "BRUNCH", label: "Brunch", emoji: "🍳" },

  // Éléments de base
  { value: "SAUCE", label: "Sauce", emoji: "🥫" },
  { value: "MARINADE", label: "Marinade", emoji: "🧂" },
  { value: "DRESSING", label: "Vinaigrette", emoji: "🫗" },
  { value: "SPREAD", label: "Tartinade", emoji: "🧈" },

  // Pâtisserie et boulangerie
  { value: "BREAD", label: "Pain", emoji: "🍞" },
  { value: "PASTRY", label: "Pâtisserie", emoji: "🥐" },
  { value: "CAKE", label: "Gâteau", emoji: "🎂" },
  { value: "COOKIE", label: "Biscuit", emoji: "🍪" },

  // Autres
  { value: "SMOOTHIE", label: "Smoothie", emoji: "🥤" },
  { value: "COCKTAIL", label: "Cocktail", emoji: "🍸" },
  { value: "PRESERVES", label: "Conserves", emoji: "🫙" },
  { value: "OTHER", label: "Autre", emoji: "📦" },
];

export const costOptions = [
  { value: "", label: "Non défini", emoji: "—" },
  { value: "CHEAP", label: "Économique", emoji: "€" },
  { value: "MEDIUM", label: "Moyen", emoji: "€€" },
  { value: "EXPENSIVE", label: "Cher", emoji: "€€€" },
];

// Import and re-export status constants from centralized location
import { RecipeStatus, statusOptions, type RecipeStatusType } from "@/lib/recipe-status";
export { RecipeStatus, statusOptions, type RecipeStatusType };

// ==================== INTERFACES ====================

export interface IngredientInput {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  quantityUnit: string; // Combined field for UI
}

export interface StepInput {
  id: string;
  text: string;
}

export interface RecipeFormProps {
  recipe?: Recipe;
  trigger?: React.ReactNode; // Optional for YouTube to Recipe mode
  isYouTubeImport?: boolean; // Flag to indicate YouTube import with red theme
  defaultOpen?: boolean; // Open the dialog by default
  hideDraftMessage?: boolean; // Hide the "draft restored" message
  onSuccess?: (recipeId: number, recipeSlug?: string) => void; // Callback when recipe is successfully saved
  onCancel?: () => void; // Callback when dialog is closed without saving
}

export interface DraftData {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  videoUrl: string;
  preparationTime: string;
  cookingTime: string;
  servings: string;
  caloriesPerServing?: string; // Optional calories per serving
  costEstimate: string;
  status?: RecipeStatusType; // Recipe visibility status
  publishAnonymously?: boolean; // Optional for backward compatibility
  tags?: string[]; // Deprecated - kept for backward compatibility
  tagIds?: number[]; // New: Tag IDs
  ingredients: IngredientInput[];
  steps: StepInput[];
  useGroups?: boolean; // Support for ingredient groups
  ingredientGroups?: any[]; // Ingredient groups data (IngredientGroupInput[])
  savedAt: number;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Parse quantity+unit field (e.g., "150g" => {quantity: "150", unit: "g"})
 */
export function parseQuantityUnit(input: string): { quantity: string; unit: string } {
  if (!input.trim()) {
    return { quantity: "", unit: "" };
  }

  // Match patterns like "150g", "1 c.à.s", "2.5 kg", etc.
  const match = input.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);

  if (match) {
    return {
      quantity: match[1].replace(",", "."), // Replace comma with dot for decimals
      unit: match[2].trim(),
    };
  }

  // If no number at the start, treat entire input as unit
  return { quantity: "", unit: input.trim() };
}

/**
 * Combine quantity and unit into a single string
 */
export function combineQuantityUnit(quantity: string, unit: string): string {
  if (!quantity && !unit) return "";
  if (!quantity) return unit;
  if (!unit) return quantity;
  return `${quantity} ${unit}`;
}

/**
 * Get initial ingredients from recipe or create default
 */
export function getInitialIngredients(recipe?: Recipe): IngredientInput[] {
  if (!recipe?.ingredients?.length) {
    return [{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }];
  }
  return recipe.ingredients.map((ing, index) => ({
    id: `ing-${index}`,
    name: ing.name,
    quantity: ing.quantity?.toString() || "",
    unit: ing.unit || "",
    quantityUnit: combineQuantityUnit(ing.quantity?.toString() || "", ing.unit || ""),
  }));
}

/**
 * Get initial steps from recipe or create default
 */
export function getInitialSteps(recipe?: Recipe): StepInput[] {
  if (!recipe?.steps?.length) {
    return [{ id: "step-0", text: "" }];
  }
  return recipe.steps.map((step, index) => ({
    id: `step-${index}`,
    text: step.text,
  }));
}
