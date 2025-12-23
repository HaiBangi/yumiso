/**
 * Views Counter Helper - Comptage des vues avec buffering en mémoire
 * 
 * ✅ Implémentation PRO avec buffer :
 * - Incrémente en RAM (ultra rapide, 0 latence)
 * - Flush en DB toutes les 30 secondes
 * - N writes / 30s au lieu de N par vue
 * - Ultra scalable
 * - Perte acceptable si crash (seulement les dernières 30s)
 */

import { db } from "./db";

// ==================== BUFFER EN MÉMOIRE ====================

// Buffer des vues en attente de flush
const viewBuffer = new Map<number, number>();

// Timestamp du dernier flush
let lastFlush = Date.now();

// Intervalle de flush en ms (10 secondes en dev, 30 en prod)
const FLUSH_INTERVAL_MS = process.env.NODE_ENV === "development" ? 10 * 1000 : 30 * 1000;

// Flag pour éviter les flush concurrents
let isFlushing = false;

// Intervalle de flush automatique (seulement en dev)
let flushInterval: NodeJS.Timeout | null = null;

/**
 * Démarrer le flush automatique en développement
 */
function startAutoFlush() {
  if (flushInterval) return;
  
  flushInterval = setInterval(() => {
    if (viewBuffer.size > 0) {
      console.log(`[Views] Auto-flush triggered (${viewBuffer.size} recipes in buffer)`);
      flushViews().catch(console.error);
    }
  }, FLUSH_INTERVAL_MS);
  
  console.log(`[Views] Auto-flush started (every ${FLUSH_INTERVAL_MS / 1000}s)`);
}

/**
 * Enregistrer une vue (ultra rapide - O(1) en RAM)
 * @param recipeId - ID de la recette
 */
export function registerView(recipeId: number): void {
  const currentCount = viewBuffer.get(recipeId) ?? 0;
  viewBuffer.set(recipeId, currentCount + 1);
  
  console.log(`[Views] Registered view for recipe ${recipeId} (buffer: ${viewBuffer.size} recipes, total: ${getBufferStats().totalViews} views)`);
  
  // Démarrer l'auto-flush si pas déjà actif
  if (!flushInterval) {
    startAutoFlush();
  }
  
  // Déclencher un flush si l'intervalle est dépassé
  const now = Date.now();
  if (now - lastFlush > FLUSH_INTERVAL_MS) {
    flushViews().catch(console.error);
  }
}

/**
 * Flush les vues en base de données
 * Appelé automatiquement toutes les 30 secondes ou manuellement
 */
export async function flushViews(): Promise<{ flushed: number; total: number }> {
  // Éviter les flush concurrents
  if (isFlushing || viewBuffer.size === 0) {
    return { flushed: 0, total: 0 };
  }

  isFlushing = true;
  lastFlush = Date.now();

  // Copier et vider le buffer atomiquement
  const toFlush = new Map(viewBuffer);
  viewBuffer.clear();

  let flushed = 0;
  let total = 0;

  try {
    // Batch update avec transaction pour performance
    const updates = Array.from(toFlush.entries()).map(([recipeId, count]) => {
      total += count;
      return db.recipe.update({
        where: { id: recipeId },
        data: { viewsCount: { increment: count } },
      });
    });

    // Exécuter toutes les mises à jour en parallèle
    await Promise.allSettled(updates);
    flushed = toFlush.size;

    console.log(`[Views] Flushed ${total} views for ${flushed} recipes`);
  } catch (error) {
    console.error("[Views] Flush error:", error);
    // En cas d'erreur, remettre les vues non flush dans le buffer
    for (const [recipeId, count] of toFlush) {
      viewBuffer.set(recipeId, (viewBuffer.get(recipeId) ?? 0) + count);
    }
  } finally {
    isFlushing = false;
  }

  return { flushed, total };
}

/**
 * Obtenir le nombre de vues en attente dans le buffer
 */
export function getBufferStats(): { recipes: number; totalViews: number } {
  let totalViews = 0;
  for (const count of viewBuffer.values()) {
    totalViews += count;
  }
  return { recipes: viewBuffer.size, totalViews };
}

// ==================== THROTTLING CÔTÉ CLIENT ====================

// Durée du throttling en minutes (1 vue max par recette par session)
const THROTTLE_MINUTES = 30;

/**
 * Vérifier si une vue doit être comptée (throttling)
 * @param viewsData - Données de vues depuis le cookie
 * @param recipeId - ID de la recette
 * @returns true si la vue doit être comptée
 */
export function shouldCountView(
  viewsData: Record<string, number>,
  recipeId: number
): boolean {
  const now = Date.now();
  const recipeKey = recipeId.toString();
  const lastView = viewsData[recipeKey];
  const throttleMs = THROTTLE_MINUTES * 60 * 1000;

  return !lastView || (now - lastView) >= throttleMs;
}

/**
 * Mettre à jour les données de vues après comptage
 */
export function updateViewsData(
  viewsData: Record<string, number>,
  recipeId: number
): Record<string, number> {
  const now = Date.now();
  const recipeKey = recipeId.toString();
  
  // Nettoyer les anciennes entrées (plus de 24h)
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const cleaned: Record<string, number> = {};
  
  for (const [key, timestamp] of Object.entries(viewsData)) {
    if (timestamp >= oneDayAgo) {
      cleaned[key] = timestamp;
    }
  }
  
  cleaned[recipeKey] = now;
  return cleaned;
}

// ==================== STATS & ANALYTICS ====================

/**
 * Récupérer les recettes les plus vues
 * @param limit - Nombre de recettes à retourner
 */
export async function getMostViewedRecipes(limit: number = 10) {
  return db.recipe.findMany({
    where: { deletedAt: null },
    orderBy: { viewsCount: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrl: true,
      category: true,
      viewsCount: true,
      rating: true,
      preparationTime: true,
      cookingTime: true,
    },
  });
}

/**
 * Récupérer les stats de vues pour l'admin
 */
export async function getViewsStats() {
  const [totalViews, recipesWithViews] = await Promise.all([
    db.recipe.aggregate({
      where: { deletedAt: null },
      _sum: { viewsCount: true },
    }),
    db.recipe.count({
      where: {
        deletedAt: null,
        viewsCount: { gt: 0 },
      },
    }),
  ]);

  const bufferStats = getBufferStats();

  return {
    totalViews: totalViews._sum.viewsCount || 0,
    recipesWithViews,
    buffer: bufferStats,
  };
}
