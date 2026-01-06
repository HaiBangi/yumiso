// Traductions des catégories de recettes
export const categoryLabels: Record<string, string> = {
  MAIN_DISH: "Plat",
  STARTER: "Entrée",
  DESSERT: "Dessert",
  SIDE_DISH: "Accompagnement",
  SOUP: "Soupe",
  SALAD: "Salade",
  BEVERAGE: "Boisson",
  SNACK: "En-cas",
  APPETIZER: "Apéritif",
  BREAKFAST: "Petit-déjeuner",
  BRUNCH: "Brunch",
  SAUCE: "Sauce",
  MARINADE: "Marinade",
  DRESSING: "Vinaigrette",
  SPREAD: "Tartinade",
  BREAD: "Pain",
  PASTRY: "Pâtisserie",
  CAKE: "Gâteau",
  COOKIE: "Biscuit",
  SMOOTHIE: "Smoothie",
  COCKTAIL: "Cocktail",
  PRESERVES: "Conserves",
  OTHER: "Autre",
};

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category;
}
