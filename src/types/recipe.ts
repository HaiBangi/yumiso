export type Category =
  | "MAIN_DISH"
  | "STARTER"
  | "DESSERT"
  | "SIDE_DISH"
  | "SOUP"
  | "SALAD"
  | "BEVERAGE"
  | "SNACK";

export interface Ingredient {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface Step {
  id: number;
  order: number;
  text: string;
}

export interface Recipe {
  id: number;
  name: string;
  description: string | null;
  category: Category;
  author: string;
  imageUrl: string | null;
  videoUrl: string | null;
  preparationTime: number;
  cookingTime: number;
  rating: number;
  servings: number;
  createdAt: Date;
  updatedAt: Date;
  ingredients: Ingredient[];
  steps: Step[];
}

export interface RecipeCreateInput {
  name: string;
  description?: string | null;
  category: Category;
  author: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  preparationTime: number;
  cookingTime: number;
  rating?: number;
  servings: number;
  ingredients: Omit<Ingredient, "id">[];
  steps: Omit<Step, "id">[];
}

export interface RecipeUpdateInput extends Partial<RecipeCreateInput> {}

