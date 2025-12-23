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

  // Vérifier si le slug existe déjà
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await db.recipe.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    // Le slug existe, ajouter un suffixe
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
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
