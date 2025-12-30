import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 🔑 Query Keys
export const mealPlannerKeys = {
  all: ['meal-planner'] as const,
  plans: () => [...mealPlannerKeys.all, 'list'] as const,
  plan: (planId: string | number | null) => [...mealPlannerKeys.all, 'detail', planId] as const,
  meals: (planId: string | number) => [...mealPlannerKeys.plan(planId), 'meals'] as const,
};

// 📥 QUERY - Récupérer un plan de repas
export function useMealPlan(planId: string | number | null) {
  return useQuery({
    queryKey: mealPlannerKeys.plan(planId),
    queryFn: async () => {
      if (!planId) return null;
      const response = await fetch(`/api/meal-planner/${planId}`);
      if (!response.ok) throw new Error('Failed to fetch meal plan');
      return response.json();
    },
    enabled: !!planId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ✏️ MUTATION - Créer un plan de repas
export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; startDate: string }) => {
      const response = await fetch('/api/meal-planner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to create meal plan');
      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealPlannerKeys.plans() });
    },
  });
}

// ✏️ MUTATION - Déplacer un repas
export function useMoveMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      mealId, 
      day, 
      mealType 
    }: { 
      mealId: number; 
      day: string; 
      mealType: string;
    }) => {
      const response = await fetch(`/api/meal-planner/meal/${mealId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, mealType }),
      });
      
      if (!response.ok) throw new Error('Failed to move meal');
      return response.json();
    },

    // Après déplacement, rafraîchir le plan
    onSuccess: (data) => {
      if (data.planId) {
        queryClient.invalidateQueries({ 
          queryKey: mealPlannerKeys.plan(data.planId) 
        });
      }
    },
  });
}

// 🗑️ MUTATION - Supprimer un repas
export function useDeleteMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealId: number) => {
      const response = await fetch(`/api/meal-planner/meal/${mealId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete meal');
      return response.json();
    },

    onSuccess: (data) => {
      if (data.planId) {
        queryClient.invalidateQueries({ 
          queryKey: mealPlannerKeys.plan(data.planId) 
        });
      }
    },
  });
}

// 📝 MUTATION - Générer la liste de courses
export function useGenerateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch('/api/meal-planner/generate-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      
      if (!response.ok) throw new Error('Failed to generate shopping list');
      return response.json();
    },

    onSuccess: (data, planId) => {
      // Invalider le plan pour rafraîchir la liste
      queryClient.invalidateQueries({ 
        queryKey: mealPlannerKeys.plan(planId) 
      });
    },
  });
}

// 🔄 MUTATION - Recalculer la liste de courses
export function useRecalculateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch('/api/meal-planner/recalculate-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      
      if (!response.ok) throw new Error('Failed to recalculate shopping list');
      return response.json();
    },

    onSuccess: (data, planId) => {
      queryClient.invalidateQueries({ 
        queryKey: mealPlannerKeys.plan(planId) 
      });
    },
  });
}
