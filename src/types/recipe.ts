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
  order?: number;
  groupId?: number | null;
}

export interface IngredientGroup {
  id: number;
  name: string;
  order: number;
  recipeId: number;
  ingredients: Ingredient[];
}

export interface Step {
  id: number;
  order: number;
  text: string;
}

export type CostEstimate = "CHEAP" | "MEDIUM" | "EXPENSIVE" | null;

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
  costEstimate: CostEstimate;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  ingredients: Ingredient[];
  ingredientGroups?: IngredientGroup[];
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
  costEstimate?: CostEstimate;
  tags?: string[];
  ingredients: Omit<Ingredient, "id">[];
  steps: Omit<Step, "id">[];
}

export interface RecipeUpdateInput extends Partial<RecipeCreateInput> {}
