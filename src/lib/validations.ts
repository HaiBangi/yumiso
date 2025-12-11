import { z } from "zod";

export const categorySchema = z.enum([
  // Plats principaux
  "MAIN_DISH",
  "STARTER",
  "DESSERT",
  "SIDE_DISH",
  
  // Soupes et salades
  "SOUP",
  "SALAD",
  
  // Boissons et collations
  "BEVERAGE",
  "SNACK",
  "APPETIZER",
  
  // Petit-déjeuner et brunch
  "BREAKFAST",
  "BRUNCH",
  
  // Éléments de base
  "SAUCE",
  "MARINADE",
  "DRESSING",
  "SPREAD",
  
  // Pâtisserie et boulangerie
  "BREAD",
  "PASTRY",
  "CAKE",
  "COOKIE",
  
  // Autres
  "SMOOTHIE",
  "COCKTAIL",
  "PRESERVES",
  "OTHER",
]);

export const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  quantity: z.number().positive().nullable(),
  unit: z.string().nullable(),
  order: z.number().int().min(0).optional(),
});

export const stepSchema = z.object({
  order: z.number().int().min(1),
  text: z.string().min(1, "Step text is required"),
});

export const ingredientGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  order: z.number().int().min(0).optional(),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required per group"),
});

// Helper for optional URL fields - allows empty string, null, or valid URL
const optionalUrl = z.string().transform(val => val === "" ? null : val).nullable().optional()
  .refine(val => val === null || val === undefined || val === "" || z.string().url().safeParse(val).success, {
    message: "Invalid URL"
  });

export const recipeCreateSchema = z.object({
  name: z.string().min(1, "Le nom de la recette est requis").max(200),
  description: z.string().max(2000).nullable().optional(),
  category: categorySchema,
  author: z.string().max(100).transform(val => val || "Anonyme"),
  imageUrl: optionalUrl,
  videoUrl: optionalUrl,
  preparationTime: z.number().int().min(0).optional().default(0),
  cookingTime: z.number().int().min(0).optional().default(0),
  rating: z.number().min(0).max(10).optional().default(0), // Calculated from comments (0-10)
  servings: z.number().int().positive().optional().default(1),
  costEstimate: z.enum(["CHEAP", "MEDIUM", "EXPENSIVE"]).nullable().optional(),
  tags: z.array(z.string().max(50)).optional().default([]),
  ingredients: z.array(ingredientSchema).optional().default([]),
  ingredientGroups: z.array(ingredientGroupSchema).optional(),
  steps: z.array(stepSchema).optional().default([]),
});

export const recipeUpdateSchema = recipeCreateSchema.partial();

export type RecipeCreateInput = z.infer<typeof recipeCreateSchema>;
export type RecipeUpdateInput = z.infer<typeof recipeUpdateSchema>;
