import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Génère un slug URL-friendly à partir d'un texte
 */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const recipes = [
  {
    name: "Médaillons de poulet citronnés",
    description: "Des médaillons de poulet tendres et juteux, marinés au citron et aux herbes de Provence pour un plat léger et savoureux.",
    category: "MAIN_DISH",
    author: "Mich",
    imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800",
    preparationTime: 10,
    cookingTime: 60,
    rating: 8,
    servings: 3,
    ingredients: [
      { name: "Poitrines de poulet", quantity: 3, unit: "pièces" },
      { name: "Citron", quantity: 2, unit: "pièces" },
      { name: "Herbes de Provence", quantity: 2, unit: "c. à soupe" },
      { name: "Ail", quantity: 3, unit: "gousses" },
      { name: "Sel, poivre", quantity: null, unit: null },
      { name: "Huile d'olive", quantity: null, unit: null },
    ],
    steps: [
      { order: 1, text: "Couper les poitrines de poulet en médaillons d'environ 2 cm d'épaisseur." },
      { order: 2, text: "Préparer la marinade en mélangeant le jus des citrons, l'huile d'olive, l'ail émincé et les herbes de Provence." },
      { order: 3, text: "Recouvrir les morceaux de poulet avec la marinade et laisser reposer 30 minutes au réfrigérateur." },
      { order: 4, text: "Préchauffer le four à 180°C." },
      { order: 5, text: "Disposer les médaillons dans un plat allant au four et cuire pendant 45 à 60 minutes." },
      { order: 6, text: "Servir chaud avec du riz ou des légumes grillés." },
    ],
  },
  {
    name: "Risotto aux champignons",
    description: "Un risotto crémeux et réconfortant aux champignons de saison, parfumé au parmesan et à la truffe.",
    category: "MAIN_DISH",
    author: "Chef Antoine",
    imageUrl: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800",
    preparationTime: 15,
    cookingTime: 35,
    rating: 9,
    servings: 4,
    ingredients: [
      { name: "Riz arborio", quantity: 300, unit: "g" },
      { name: "Champignons de Paris", quantity: 250, unit: "g" },
      { name: "Champignons shiitake", quantity: 150, unit: "g" },
      { name: "Bouillon de légumes", quantity: 1, unit: "L" },
      { name: "Vin blanc sec", quantity: 150, unit: "ml" },
      { name: "Parmesan râpé", quantity: 80, unit: "g" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Beurre", quantity: 50, unit: "g" },
      { name: "Huile de truffe", quantity: null, unit: null },
    ],
    steps: [
      { order: 1, text: "Nettoyer et émincer les champignons. Faire chauffer le bouillon et le maintenir à frémissement." },
      { order: 2, text: "Dans une grande casserole, faire revenir l'oignon émincé dans le beurre jusqu'à translucidité." },
      { order: 3, text: "Ajouter les champignons et les faire sauter 5 minutes à feu vif." },
      { order: 4, text: "Ajouter le riz et le nacrer 2 minutes en remuant." },
      { order: 5, text: "Déglacer avec le vin blanc et laisser absorber." },
      { order: 6, text: "Ajouter le bouillon louche par louche, en remuant constamment, jusqu'à ce que le riz soit crémeux (environ 18-20 minutes)." },
      { order: 7, text: "Hors du feu, incorporer le parmesan et un filet d'huile de truffe. Servir immédiatement." },
    ],
  },
  {
    name: "Tarte au citron meringuée",
    description: "Une tarte classique avec une crème au citron acidulée et une meringue légère dorée au four.",
    category: "DESSERT",
    author: "Marie",
    imageUrl: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=800",
    preparationTime: 45,
    cookingTime: 40,
    rating: 10,
    servings: 8,
    ingredients: [
      { name: "Pâte sablée", quantity: 1, unit: "rouleau" },
      { name: "Citrons bio", quantity: 4, unit: "pièces" },
      { name: "Sucre en poudre", quantity: 200, unit: "g" },
      { name: "Œufs", quantity: 6, unit: "pièces" },
      { name: "Beurre doux", quantity: 100, unit: "g" },
      { name: "Maïzena", quantity: 30, unit: "g" },
      { name: "Sucre glace", quantity: 150, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Préchauffer le four à 180°C. Foncer un moule à tarte avec la pâte sablée et cuire à blanc 15 minutes." },
      { order: 2, text: "Préparer la crème au citron : mélanger le jus et zestes de citrons, le sucre, les jaunes d'œufs et la maïzena." },
      { order: 3, text: "Faire épaissir à feu doux en remuant constamment. Hors du feu, ajouter le beurre en morceaux." },
      { order: 4, text: "Verser la crème sur le fond de tarte précuit et laisser refroidir." },
      { order: 5, text: "Monter les blancs en neige ferme, incorporer progressivement le sucre glace pour obtenir une meringue brillante." },
      { order: 6, text: "Recouvrir la tarte de meringue et passer au four 10 minutes pour la dorer légèrement." },
    ],
  },
  {
    name: "Gaspacho andalou",
    description: "Une soupe froide espagnole rafraîchissante, parfaite pour les journées chaudes d'été.",
    category: "SOUP",
    author: "Carmen",
    imageUrl: "https://images.unsplash.com/photo-1529566193389-f26c83d2e66c?w=800",
    preparationTime: 20,
    cookingTime: 0,
    rating: 7,
    servings: 6,
    ingredients: [
      { name: "Tomates bien mûres", quantity: 1, unit: "kg" },
      { name: "Concombre", quantity: 1, unit: "pièce" },
      { name: "Poivron rouge", quantity: 1, unit: "pièce" },
      { name: "Oignon rouge", quantity: 0.5, unit: "pièce" },
      { name: "Gousse d'ail", quantity: 2, unit: "pièces" },
      { name: "Vinaigre de Xérès", quantity: 3, unit: "c. à soupe" },
      { name: "Huile d'olive extra vierge", quantity: 100, unit: "ml" },
      { name: "Pain rassis", quantity: 50, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Faire tremper le pain dans un peu d'eau pendant 10 minutes." },
      { order: 2, text: "Laver et couper grossièrement les tomates, le concombre, le poivron et l'oignon." },
      { order: 3, text: "Mixer tous les légumes avec l'ail, le pain essoré et le vinaigre jusqu'à obtenir une texture lisse." },
      { order: 4, text: "En continuant de mixer, ajouter l'huile d'olive en filet pour émulsionner." },
      { order: 5, text: "Assaisonner de sel et poivre. Réfrigérer au moins 2 heures avant de servir bien frais." },
    ],
  },
  {
    name: "Salade César",
    description: "La célèbre salade avec sa sauce crémeuse, ses croûtons dorés et son parmesan généreux.",
    category: "SALAD",
    author: "Mich",
    imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800",
    preparationTime: 20,
    cookingTime: 15,
    rating: 8,
    servings: 4,
    ingredients: [
      { name: "Laitue romaine", quantity: 2, unit: "têtes" },
      { name: "Poulet grillé", quantity: 400, unit: "g" },
      { name: "Parmesan", quantity: 100, unit: "g" },
      { name: "Pain de campagne", quantity: 150, unit: "g" },
      { name: "Anchois", quantity: 4, unit: "filets" },
      { name: "Jaune d'œuf", quantity: 1, unit: "pièce" },
      { name: "Moutarde de Dijon", quantity: 1, unit: "c. à café" },
      { name: "Huile d'olive", quantity: 120, unit: "ml" },
      { name: "Jus de citron", quantity: 2, unit: "c. à soupe" },
    ],
    steps: [
      { order: 1, text: "Couper le pain en cubes et les faire dorer au four à 180°C pendant 10-15 minutes pour obtenir des croûtons." },
      { order: 2, text: "Préparer la sauce : mixer les anchois, le jaune d'œuf, la moutarde, le jus de citron et 30g de parmesan." },
      { order: 3, text: "Ajouter l'huile d'olive en filet tout en mixant pour émulsionner." },
      { order: 4, text: "Laver et essorer la laitue, la couper en morceaux." },
      { order: 5, text: "Assembler la salade : disposer la laitue, ajouter le poulet émincé, les croûtons, des copeaux de parmesan et napper de sauce." },
    ],
  },
  {
    name: "Smoothie bowl tropical",
    description: "Un bol vitaminé et coloré pour un petit-déjeuner énergisant et sain.",
    category: "BEVERAGE",
    author: "Julie",
    imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800",
    preparationTime: 10,
    cookingTime: 0,
    rating: 9,
    servings: 2,
    ingredients: [
      { name: "Banane congelée", quantity: 2, unit: "pièces" },
      { name: "Mangue", quantity: 150, unit: "g" },
      { name: "Ananas", quantity: 100, unit: "g" },
      { name: "Lait de coco", quantity: 150, unit: "ml" },
      { name: "Granola", quantity: 60, unit: "g" },
      { name: "Noix de coco râpée", quantity: 20, unit: "g" },
      { name: "Graines de chia", quantity: 1, unit: "c. à soupe" },
      { name: "Fruits frais pour décorer", quantity: null, unit: null },
    ],
    steps: [
      { order: 1, text: "Mixer les bananes congelées, la mangue, l'ananas et le lait de coco jusqu'à obtenir une consistance épaisse et crémeuse." },
      { order: 2, text: "Répartir le smoothie dans deux bols." },
      { order: 3, text: "Garnir avec le granola, la noix de coco râpée, les graines de chia et les fruits frais de votre choix." },
      { order: 4, text: "Servir immédiatement pour profiter de la fraîcheur." },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.step.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.recipe.deleteMany();

  console.log("🗑️  Cleared existing data");

  // Create recipes with ingredients and steps
  for (const recipe of recipes) {
    const { ingredients, steps, ...recipeData } = recipe;

    await prisma.recipe.create({
      data: {
        ...recipeData,
        slug: slugify(recipeData.name),
        ingredients: {
          create: ingredients,
        },
        steps: {
          create: steps,
        },
      },
    });

    console.log(`✅ Created recipe: ${recipe.name}`);
  }

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
