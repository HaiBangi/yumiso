import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Recipe } from '@/types/recipe';

// Query Keys - centralisés pour éviter les doublons
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...recipeKeys.lists(), filters] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (idOrSlug: string) => [...recipeKeys.details(), idOrSlug] as const,
  autocomplete: (query: string) => [...recipeKeys.all, 'autocomplete', query] as const,
};

// Hook pour fetcher une recette par ID ou slug (utilisé dans AppHeader)
export function useRecipe(idOrSlug: string | null | undefined) {
  return useQuery({
    queryKey: recipeKeys.detail(idOrSlug || ''),
    queryFn: async () => {
      if (!idOrSlug) return null;
      const response = await fetch(`/api/recipes/${idOrSlug}`);
      if (!response.ok) throw new Error('Recipe not found');
      return response.json() as Promise<Recipe>;
    },
    enabled: !!idOrSlug, // Ne fetch que si idOrSlug existe
    staleTime: 1000 * 60 * 10, // 10 minutes - les recettes changent rarement
  });
}

// Hook pour l'autocomplete de recherche
export function useRecipeAutocomplete(query: string) {
  return useQuery({
    queryKey: recipeKeys.autocomplete(query),
    queryFn: async () => {
      const response = await fetch(`/api/recipes/autocomplete?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Autocomplete failed');
      return response.json();
    },
    enabled: query.length >= 2, // Ne cherche que si >= 2 caractères
    staleTime: 1000 * 60 * 2, // 2 minutes pour l'autocomplete
  });
}

// Hook pour supprimer une recette avec invalidation du cache
export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: number) => {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete recipe');
      return response.json();
    },
    onSuccess: () => {
      // Invalider toutes les listes de recettes pour forcer un refetch
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

// Hook pour optimiser une recette (ChatGPT)
export function useOptimizeRecipe() {
  return useMutation({
    mutationFn: async (data: { name: string; ingredients: string[]; steps: string[] }) => {
      const response = await fetch('/api/recipes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to optimize recipe');
      return response.json();
    },
  });
}
