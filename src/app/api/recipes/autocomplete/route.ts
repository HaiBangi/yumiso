import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Function to remove accents and normalize ligatures for comparison
function removeAccents(str: string): string {
  // Étape 1: Remplacer les ligatures et caractères spéciaux
  const ligatureMap: Record<string, string> = {
    'œ': 'oe',
    'Œ': 'oe',
    'æ': 'ae',
    'Æ': 'ae',
    'ß': 'ss',
    'ø': 'o',
    'Ø': 'o',
    'å': 'a',
    'Å': 'a',
  };

  let processed = str;
  Object.entries(ligatureMap).forEach(([char, replacement]) => {
    processed = processed.replace(new RegExp(char, 'g'), replacement);
  });

  // Étape 2: Normalisation NFD pour décomposer les accents
  return processed
    .normalize("NFD") // Décompose les caractères accentués (é → e + accent)
    .replace(/[\u0300-\u036f]/g, ""); // Supprime les accents décomposés
}

// Smart search: checks if all search words appear in the recipe name (in any order)
function smartMatch(recipeName: string, searchQuery: string): boolean {
  const normalizedRecipe = removeAccents(recipeName.toLowerCase());
  const normalizedQuery = removeAccents(searchQuery.toLowerCase());

  // Split search query into words
  const searchWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);

  // Check if all search words are found in the recipe name
  return searchWords.every(word => normalizedRecipe.includes(word));
}

// Calculate relevance score (for sorting)
function calculateRelevance(recipeName: string, searchQuery: string): number {
  const normalizedRecipe = removeAccents(recipeName.toLowerCase());
  const normalizedQuery = removeAccents(searchQuery.toLowerCase());

  let score = 0;

  // Exact match gets highest score
  if (normalizedRecipe === normalizedQuery) {
    score += 1000;
  }

  // Starts with query gets high score
  if (normalizedRecipe.startsWith(normalizedQuery)) {
    score += 500;
  }

  // Contains query as whole word gets medium score
  if (normalizedRecipe.includes(normalizedQuery)) {
    score += 100;
  }

  // Add points for each matching word
  const searchWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
  searchWords.forEach(word => {
    if (normalizedRecipe.includes(word)) {
      score += 10;
    }
  });

  return score;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    // Fetch recipes with additional info for display
    const recipes = await db.recipe.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        author: true,
        rating: true,
        preparationTime: true,
        cookingTime: true,
        caloriesPerServing: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Filter and sort recipes by relevance
    const filteredRecipes = recipes
      .filter((recipe) => smartMatch(recipe.name, query))
      .map((recipe) => ({
        ...recipe,
        relevance: calculateRelevance(recipe.name, query),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10)
      .map(({ relevance: _relevance, ...recipe }) => recipe); // Remove relevance from final result

    return NextResponse.json(filteredRecipes);
  } catch (error) {
    console.error("Error fetching autocomplete suggestions:", error);
    return NextResponse.json([]);
  }
}
