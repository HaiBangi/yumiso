"use client";

import { useEffect, useRef } from "react";

interface ViewTrackerProps {
  recipeId: number;
}

/**
 * Composant invisible qui track les vues de recettes
 * - Envoie une requête à l'API après 2 secondes (pour éviter les rebonds)
 * - Throttling côté serveur (1 vue par 30 min par recette par utilisateur)
 */
export function ViewTracker({ recipeId }: ViewTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Éviter les doubles appels (React StrictMode)
    if (hasTracked.current) return;

    // Attendre 2 secondes avant de compter la vue (évite les rebonds)
    const timeoutId = setTimeout(async () => {
      if (hasTracked.current) return;
      hasTracked.current = true;

      try {
        await fetch("/api/recipes/views", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipeId }),
        });
      } catch (error) {
        // Silently fail - les vues ne sont pas critiques
        console.debug("Failed to track view:", error);
      }
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [recipeId]);

  // Composant invisible
  return null;
}
