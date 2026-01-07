import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

// Query Keys
export const shoppingListKeys = {
  all: ['shopping-lists'] as const,
  lists: () => [...shoppingListKeys.all, 'list'] as const,
  detail: (listId: number) => [...shoppingListKeys.all, 'detail', listId] as const,
  items: (listId: number) => [...shoppingListKeys.detail(listId), 'items'] as const,
};

// Type pour un item de shopping list
type ShoppingItem = {
  id?: number;
  ingredientName: string;
  category: string;
  isChecked: boolean;
  checkedBy?: string | null;
  addedBy?: string;
};

// Hook pour toggle un item avec OPTIMISTIC UI
export function useToggleShoppingItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemName, 
      category, 
      isChecked 
    }: { 
      itemName: string; 
      category: string; 
      isChecked: boolean;
    }) => {
      const response = await fetch('/api/shopping-list/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, ingredientName: itemName, category, isChecked }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to toggle item');
      }
      return response.json();
    },

    // 🎯 OPTIMISTIC UPDATE - L'UI se met à jour INSTANTANÉMENT
    onMutate: async ({ itemName, category, isChecked }) => {
      // Annuler les refetch en cours pour éviter les conflits
      await queryClient.cancelQueries({ 
        queryKey: shoppingListKeys.detail(listId) 
      });

      // Sauvegarder l'ancien état pour rollback si erreur
      const previousList = queryClient.getQueryData(shoppingListKeys.detail(listId));

      // Mettre à jour l'UI immédiatement (optimistic)
      queryClient.setQueryData(shoppingListKeys.detail(listId), (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const oldList = old as { items?: ShoppingItem[] };
        
        if (!oldList.items || !Array.isArray(oldList.items)) return old;
        
        return {
          ...oldList,
          items: oldList.items.map((item) =>
            item.ingredientName === itemName && item.category === category
              ? { ...item, isChecked }
              : item
          ),
        };
      });

      // Retourner le contexte pour rollback si erreur
      return { previousList };
    },

    // Si erreur, rollback à l'ancien état
    onError: (err, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          shoppingListKeys.detail(listId),
          context.previousList
        );
      }
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de mettre à jour l'article",
        variant: "destructive",
      });
    },

    // À la fin, refetch pour être sûr d'être synchronisé avec le serveur
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: shoppingListKeys.detail(listId) 
      });
    },
  });
}

// Hook pour ajouter un item avec OPTIMISTIC UI
export function useAddShoppingItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemName,
      category,
      storeName
    }: {
      itemName: string;
      category?: string;
      storeName?: string | null;
    }) => {
      const response = await fetch('/api/shopping-list/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, ingredientName: itemName, category, storeName: storeName ?? undefined }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add item');
      }
      return response.json();
    },

    // Optimistic: ajouter immédiatement à l'UI
    onMutate: async ({ itemName, category }) => {
      await queryClient.cancelQueries({ 
        queryKey: shoppingListKeys.detail(listId) 
      });

      const previousList = queryClient.getQueryData(shoppingListKeys.detail(listId));

      // Ajouter l'item de manière optimiste
      queryClient.setQueryData(shoppingListKeys.detail(listId), (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const oldList = old as { items?: ShoppingItem[] };
        
        if (!oldList.items || !Array.isArray(oldList.items)) return old;
        
        // Créer un item temporaire
        const tempItem: ShoppingItem = {
          ingredientName: itemName,
          category: category || 'AUTRES',
          isChecked: false,
        };
        
        return {
          ...oldList,
          items: [...oldList.items, tempItem],
        };
      });

      return { previousList };
    },

    onError: (err, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          shoppingListKeys.detail(listId),
          context.previousList
        );
      }
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'ajouter l'article",
        variant: "destructive",
      });
    },

    onSuccess: () => {
      toast({
        title: "Ajouté",
        description: "Article ajouté à la liste",
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: shoppingListKeys.detail(listId) 
      });
    },
  });
}

// Hook pour supprimer un item avec OPTIMISTIC UI
export function useRemoveShoppingItem(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemName, 
      category 
    }: { 
      itemName: string; 
      category: string;
    }) => {
      const response = await fetch('/api/shopping-list/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, ingredientName: itemName, category }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove item');
      }
      return response.json();
    },

    // Optimistic: retirer immédiatement de l'UI
    onMutate: async ({ itemName, category }) => {
      await queryClient.cancelQueries({ 
        queryKey: shoppingListKeys.detail(listId) 
      });

      const previousList = queryClient.getQueryData(shoppingListKeys.detail(listId));

      queryClient.setQueryData(shoppingListKeys.detail(listId), (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const oldList = old as { items?: ShoppingItem[] };
        
        if (!oldList.items || !Array.isArray(oldList.items)) return old;
        
        return {
          ...oldList,
          items: oldList.items.filter((item) =>
            !(item.ingredientName === itemName && item.category === category)
          ),
        };
      });

      return { previousList };
    },

    onError: (err, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          shoppingListKeys.detail(listId),
          context.previousList
        );
      }
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de supprimer l'article",
        variant: "destructive",
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: shoppingListKeys.detail(listId) 
      });
    },
  });
}

// Hook pour optimiser la liste (regrouper par catégories)
export function useOptimizeShoppingList(listId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/shopping-lists/${listId}/optimize`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to optimize');
      }
      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: shoppingListKeys.detail(listId) 
      });
      toast({
        title: "Liste optimisée !",
        description: "Les articles ont été regroupés par catégorie",
      });
    },

    onError: (err) => {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'optimiser la liste",
        variant: "destructive",
      });
    },
  });
}
