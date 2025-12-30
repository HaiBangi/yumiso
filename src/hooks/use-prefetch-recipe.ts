import { useQueryClient } from '@tanstack/react-query';
import { recipeKeys } from './use-recipe-query';
import { useCallback } from 'react';

/**
 * Hook pour précharger une recette au hover
 * Améliore la perception de vitesse en chargeant les données avant le clic
 */
export function usePrefetchRecipe() {
  const queryClient = useQueryClient();

  const prefetchRecipe = useCallback(
    (idOrSlug: string) => {
      // Précharger seulement si pas déjà en cache
      queryClient.prefetchQuery({
        queryKey: recipeKeys.detail(idOrSlug),
        queryFn: async () => {
          const response = await fetch(`/api/recipes/${idOrSlug}`);
          if (!response.ok) throw new Error('Recipe not found');
          return response.json();
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
      });
    },
    [queryClient]
  );

  return prefetchRecipe;
}

/**
 * Hook pour créer des props de hover optimisés
 * Usage: <Link {...usePrefetchProps(recipe.slug)} />
 */
export function usePrefetchProps(idOrSlug: string) {
  const prefetch = usePrefetchRecipe();

  return {
    onMouseEnter: () => prefetch(idOrSlug),
    onTouchStart: () => prefetch(idOrSlug), // Pour mobile
  };
}
