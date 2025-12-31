export type Category =
  // Plats principaux
  | "MAIN_DISH"        // Plat principal
  | "STARTER"          // Entrée
  | "DESSERT"          // Dessert
  | "SIDE_DISH"        // Accompagnement

  // Soupes et salades
  | "SOUP"             // Soupe / Potage
  | "SALAD"            // Salade

  // Boissons et collations
  | "BEVERAGE"         // Boisson
  | "SNACK"            // En-cas / Collation
  | "APPETIZER"        // Apéritif / Tapas

  // Petit-déjeuner et brunch
  | "BREAKFAST"        // Petit-déjeuner
  | "BRUNCH"           // Brunch

  // Éléments de base
  | "SAUCE"            // Sauce / Condiment
  | "MARINADE"         // Marinade
  | "DRESSING"         // Vinaigrette / Assaisonnement
  | "SPREAD"           // Tartinade / Pâte à tartiner

  // Pâtisserie et boulangerie
  | "BREAD"            // Pain / Viennoiserie
  | "PASTRY"           // Pâtisserie
  | "CAKE"             // Gâteau
  | "COOKIE"           // Biscuit / Cookie

  // Autres
  | "SMOOTHIE"         // Smoothie / Jus
  | "COCKTAIL"         // Cocktail
  | "PRESERVES"        // Conserves / Confitures
  | "OTHER";           // Autre

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

export interface Tag {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeTag {
  id: number;
  recipeId: number;
  tagId: number;
  tag: Tag;
  createdAt: Date;
}

export type CostEstimate = "CHEAP" | "MEDIUM" | "EXPENSIVE" | null;

export type RecipeStatus = "DRAFT" | "PRIVATE" | "PUBLIC";

export interface Recipe {
  id: number;
  slug?: string;
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
  caloriesPerServing?: number | null;
  costEstimate: CostEstimate;
  status?: RecipeStatus;
  viewsCount?: number;
  tags: string[]; // Deprecated - use recipeTags instead
  recipeTags?: RecipeTag[]; // New: relations with Tag table
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
  caloriesPerServing?: number | null;
  costEstimate?: CostEstimate;
  tags?: string[]; // Deprecated - use tagIds instead
  tagIds?: number[]; // New: IDs of tags to connect
  ingredients: Omit<Ingredient, "id">[];
  steps: Omit<Step, "id">[];
}

export interface RecipeUpdateInput extends Partial<RecipeCreateInput> {}
