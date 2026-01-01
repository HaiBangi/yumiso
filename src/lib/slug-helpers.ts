/**
 * Slug Helper - Génération et gestion des slugs pour le SEO
 *
 * Les slugs sont des identifiants URL-friendly uniques pour chaque recette.
 * Exemple: "Phở Bò Traditionnel" → "pho-bo-traditionnel"
 */

import { db } from "./db";

/**
 * Normalise une chaîne pour créer un slug URL-friendly
 * - Supprime les accents
 * - Convertit en minuscules
 * - Remplace les espaces et caractères spéciaux par des tirets
 * - Supprime les tirets multiples et en début/fin
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD") // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Supprime les caractères spéciaux
    .replace(/[\s_]+/g, "-") // Remplace espaces et underscores par des tirets
    .replace(/-+/g, "-") // Supprime les tirets multiples
    .replace(/^-+|-+$/g, ""); // Supprime les tirets en début/fin
}

/**
 * Génère un slug unique pour une recette
 * Si le slug existe déjà, ajoute un suffixe numérique
 * @param name - Nom de la recette
 * @param excludeId - ID de la recette à exclure (pour les updates)
 */
export async function generateUniqueSlug(name: string, excludeId?: number): Promise<string> {
  const baseSlug = slugify(name);

  if (!baseSlug) {
    // Si le nom ne génère pas de slug valide, utiliser un fallback
    return `recette-${Date.now()}`;
  }

  // Compter combien de recettes existent avec ce slug de base (avec ou sans suffixe numérique)
  // IMPORTANT: Utiliser findMany avec un résultat complet pour éviter les problèmes de cache
  const existingRecipes = await db.recipe.findMany({
    where: {
      OR: [
        { slug: baseSlug },
        { slug: { startsWith: `${baseSlug}-` } },
      ],
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { slug: true, id: true }, // Inclure id pour forcer un refresh
    orderBy: { id: "desc" }, // Trier pour obtenir les plus récents en premier
  });

  console.log(`[generateUniqueSlug] Found ${existingRecipes.length} existing recipes for base "${baseSlug}"`);

  // Si aucune recette n'existe avec ce slug, retourner le slug de base
  if (existingRecipes.length === 0) {
    console.log(`[generateUniqueSlug] No existing recipes, returning "${baseSlug}"`);
    return baseSlug;
  }

  // Extraire tous les numéros utilisés
  const usedNumbers = new Set<number>();
  existingRecipes.forEach((recipe) => {
    if (recipe.slug === baseSlug) {
      usedNumbers.add(1); // Le slug sans numéro compte comme 1
    } else {
      const match = recipe.slug.match(new RegExp(`^${baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`));
      if (match) {
        usedNumbers.add(parseInt(match[1]));
      }
    }
  });

  console.log(`[generateUniqueSlug] Used numbers:`, Array.from(usedNumbers).sort((a, b) => a - b));

  // Trouver le prochain numéro disponible
  let nextNumber = 2;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  const result = `${baseSlug}-${nextNumber}`;
  console.log(`[generateUniqueSlug] Returning "${result}"`);
  return result;
}

/**
 * Récupère une recette par son slug
 * @param slug - Slug de la recette
 */
export async function getRecipeBySlug(slug: string) {
  return db.recipe.findFirst({
    where: {
      slug,
      deletedAt: null,
    },
    include: {
      ingredients: {
        orderBy: { order: "asc" },
      },
      ingredientGroups: {
        include: {
          ingredients: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      steps: { orderBy: { order: "asc" } },
      comments: {
        where: { deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              pseudo: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Vérifie si un slug est disponible
 * @param slug - Slug à vérifier
 * @param excludeId - ID de la recette à exclure
 */
export async function isSlugAvailable(slug: string, excludeId?: number): Promise<boolean> {
  const existing = await db.recipe.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  return !existing;
}
