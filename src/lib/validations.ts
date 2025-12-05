import { z } from "zod";

export const categorySchema = z.enum([
  "MAIN_DISH",
  "STARTER",
  "DESSERT",
  "SIDE_DISH",
  "SOUP",
  "SALAD",
  "BEVERAGE",
  "SNACK",
]);

export const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  quantity: z.number().positive().nullable(),
  unit: z.string().nullable(),
});

export const stepSchema = z.object({
  order: z.number().int().positive(),
  text: z.string().min(1, "Step description is required"),
});

export const recipeCreateSchema = z.object({
  name: z.string().min(1, "Recipe name is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  category: categorySchema,
  author: z.string().min(1, "Author is required").max(100),
  imageUrl: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  preparationTime: z.number().int().min(0),
  cookingTime: z.number().int().min(0),
  rating: z.number().int().min(0).max(10).optional().default(0),
  servings: z.number().int().positive(),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient required"),
  steps: z.array(stepSchema).min(1, "At least one step required"),
});

export const recipeUpdateSchema = recipeCreateSchema.partial();

export type RecipeCreateInput = z.infer<typeof recipeCreateSchema>;
export type RecipeUpdateInput = z.infer<typeof recipeUpdateSchema>;

