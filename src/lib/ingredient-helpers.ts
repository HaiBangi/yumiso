import type { IngredientGroup } from "@/types/recipe";

export interface IngredientInput {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  quantityUnit: string;
}

export interface IngredientGroupInput {
  id: string;
  name: string;
  ingredients: IngredientInput[];
}

// Parser pour extraire quantité et unité d'une chaîne combinée
export function parseQuantityUnit(quantityUnit: string): { quantity: string; unit: string } {
  if (!quantityUnit.trim()) {
    return { quantity: "", unit: "" };
  }

  // Extraire le nombre au début (peut inclure des décimales et fractions)
  const match = quantityUnit.match(/^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(.*)$/);

  if (match) {
    return {
      quantity: match[1].replace(",", "."),
      unit: match[2].trim(),
    };
  }

  // Si pas de nombre trouvé, tout est considéré comme unité
  return { quantity: "", unit: quantityUnit.trim() };
}

// Combiner quantité et unité en une seule chaîne
export function combineQuantityUnit(quantity: string | number | null, unit: string | null): string {
  if (!quantity && !unit) return "";
  if (!quantity) return unit || "";
  if (!unit) return String(quantity);
  return `${quantity} ${unit}`;
}

// Convertir un groupe avec quantityUnit en ingrédients séparés pour l'API
export function convertGroupToApiFormat(group: IngredientGroupInput) {
  return {
    name: group.name,
    ingredients: group.ingredients.map((ing, index) => {
      const { quantity, unit } = parseQuantityUnit(ing.quantityUnit);
      return {
        name: ing.name,
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        order: index,
      };
    }),
  };
}

// Convertir des ingrédients simples en groupes pour le formulaire
export function convertIngredientsToGroups(ingredients: any[]): IngredientGroupInput[] {
  if (!ingredients || ingredients.length === 0) {
    return [{
      id: `group-${Date.now()}`,
      name: "Ingrédients",
      ingredients: [{
        id: `ing-0`,
        name: "",
        quantity: "",
        unit: "",
        quantityUnit: ""
      }],
    }];
  }

  return [{
    id: `group-${Date.now()}`,
    name: "Ingrédients",
    ingredients: ingredients.map((ing, index) => ({
      id: `ing-${index}`,
      name: ing.name || "",
      quantity: ing.quantity?.toString() || "",
      unit: ing.unit || "",
      quantityUnit: combineQuantityUnit(ing.quantity, ing.unit),
    })),
  }];
}

// Convertir des groupes d'ingrédients de la DB en format formulaire
export function convertDbGroupsToFormGroups(groups: IngredientGroup[] | undefined): IngredientGroupInput[] {
  if (!groups || groups.length === 0) {
    return [{
      id: `group-${Date.now()}`,
      name: "Ingrédients",
      ingredients: [{
        id: `ing-0`,
        name: "",
        quantity: "",
        unit: "",
        quantityUnit: ""
      }],
    }];
  }

  return groups.map((group, groupIndex) => ({
    id: `group-${groupIndex}`,
    name: group.name,
    ingredients: group.ingredients.map((ing, ingIndex) => ({
      id: `ing-${groupIndex}-${ingIndex}`,
      name: ing.name,
      quantity: ing.quantity?.toString() || "",
      unit: ing.unit || "",
      quantityUnit: combineQuantityUnit(ing.quantity, ing.unit),
    })),
  }));
}

// Convertir des groupes vers des ingrédients simples (pour le mode simple)
export function flattenGroupsToIngredients(groups: IngredientGroupInput[]): IngredientInput[] {
  return groups.flatMap(group => group.ingredients);
}

// Regrouper des ingrédients simples en un seul groupe
export function wrapIngredientsInDefaultGroup(ingredients: IngredientInput[]): IngredientGroupInput[] {
  return [{
    id: `group-${Date.now()}`,
    name: "Ingrédients",
    ingredients: ingredients.length > 0 ? ingredients : [{
      id: `ing-0`,
      name: "",
      quantity: "",
      unit: "",
      quantityUnit: ""
    }],
  }];
}

