/**
 * LocalStorage Cache Manager pour les recettes récemment consultées
 * Permet un chargement instantané même sans connexion
 */

const RECENT_RECIPES_KEY = 'yumiso:recent-recipes';
const MAX_RECENT_RECIPES = 10;

export type CachedRecipe = {
  id: number;
  slug: string;
  name: string;
  category: string;
  imageUrl: string | null;
  author: string;
  preparationTime: number;
  cookingTime: number;
  rating: number;
  cachedAt: number; // Timestamp
};

/**
 * Sauvegarder une recette dans le cache localStorage
 */
export function cacheRecipe(recipe: CachedRecipe): void {
  if (typeof window === 'undefined') return;

  try {
    const cached = getRecentRecipes();
    
    // Retirer l'ancienne version si existe
    const filtered = cached.filter((r) => r.slug !== recipe.slug);
    
    // Ajouter en première position
    const updated = [
      { ...recipe, cachedAt: Date.now() },
      ...filtered
    ].slice(0, MAX_RECENT_RECIPES);
    
    localStorage.setItem(RECENT_RECIPES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[RecipeCache] Failed to cache recipe:', error);
  }
}

/**
 * Récupérer toutes les recettes en cache
 */
export function getRecentRecipes(): CachedRecipe[] {
  if (typeof window === 'undefined') return [];

  try {
    const cached = localStorage.getItem(RECENT_RECIPES_KEY);
    if (!cached) return [];
    
    const parsed = JSON.parse(cached) as CachedRecipe[];
    
    // Filtrer les recettes de plus de 7 jours
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return parsed.filter((r) => r.cachedAt > sevenDaysAgo);
  } catch (error) {
    console.warn('[RecipeCache] Failed to get cached recipes:', error);
    return [];
  }
}

/**
 * Récupérer une recette spécifique du cache
 */
export function getCachedRecipe(slug: string): CachedRecipe | null {
  const cached = getRecentRecipes();
  return cached.find((r) => r.slug === slug) || null;
}

/**
 * Nettoyer le cache
 */
export function clearRecipeCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(RECENT_RECIPES_KEY);
  } catch (error) {
    console.warn('[RecipeCache] Failed to clear cache:', error);
  }
}

/**
 * Hook React pour auto-cache une recette quand elle est consultée
 */
import { useEffect } from 'react';

export function useRecipeCache(recipe: CachedRecipe | null): void {
  useEffect(() => {
    if (recipe) {
      cacheRecipe(recipe);
    }
  }, [recipe]);
}
