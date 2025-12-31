import { z } from "zod";

// Recipe status - visibility control
export const recipeStatusSchema = z.enum([
  "DRAFT",    // Brouillon - visible uniquement par l'auteur
  "PRIVATE",  // Privé - visible uniquement par l'auteur
  "PUBLIC",   // Public - visible par tous
]);

export type RecipeStatus = z.infer<typeof recipeStatusSchema>;

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
  name: z.string()
    .min(1, "Group name is required")
    .max(200, "Le nom du groupe ne peut pas dépasser 200 caractères"),
  order: z.number().int().min(0).max(100, "Trop de groupes").optional(),
  ingredients: z.array(ingredientSchema)
    .min(1, "At least one ingredient is required per group")
    .max(100, "Trop d'ingrédients par groupe"),
});

// Helper for optional URL fields - allows empty string, null, or valid URL
const optionalUrl = z.string().transform(val => val === "" ? null : val).nullable().optional()
  .refine(val => val === null || val === undefined || val === "" || z.string().url().safeParse(val).success, {
    message: "Invalid URL"
  });

export const recipeCreateSchema = z.object({
  name: z.string()
    .min(1, "Le nom de la recette est requis")
    .max(200, "Le nom ne peut pas dépasser 200 caractères"),
  description: z.string()
    .max(2000, "La description ne peut pas dépasser 2000 caractères")
    .nullable()
    .optional(),
  category: categorySchema,
  author: z.string()
    .max(100, "Le nom de l'auteur ne peut pas dépasser 100 caractères")
    .transform(val => val || "Anonyme"),
  imageUrl: optionalUrl,
  videoUrl: optionalUrl,
  preparationTime: z.number().int().min(0).max(1440).optional().default(0), // Max 24h
  cookingTime: z.number().int().min(0).max(1440).optional().default(0), // Max 24h
  rating: z.number().min(0).max(10).optional().default(0),
  servings: z.number().int().positive().max(100).optional().default(1), // Max 100 portions
  caloriesPerServing: z.number().int().min(0).max(10000).nullable().optional(),
  costEstimate: z.enum(["CHEAP", "MEDIUM", "EXPENSIVE"]).nullable().optional(),
  tagIds: z.array(z.number().int().positive())
    .max(20, "Maximum 20 tags par recette")
    .optional()
    .default([]),
  status: recipeStatusSchema.optional().default("PUBLIC"),
  ingredients: z.array(ingredientSchema)
    .max(100, "Maximum 100 ingrédients par recette")
    .optional()
    .default([]),
  ingredientGroups: z.array(ingredientGroupSchema)
    .max(20, "Maximum 20 groupes d'ingrédients")
    .optional(),
  steps: z.array(stepSchema)
    .max(100, "Maximum 100 étapes par recette")
    .optional()
    .default([]),
});

export const recipeUpdateSchema = recipeCreateSchema.partial();

export type RecipeCreateInput = z.infer<typeof recipeCreateSchema>;
export type RecipeUpdateInput = z.infer<typeof recipeUpdateSchema>;
