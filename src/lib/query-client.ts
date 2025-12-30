import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - les données restent fraîches
      gcTime: 1000 * 60 * 30, // 30 minutes - garde en cache
      refetchOnWindowFocus: false, // Ne pas refetch au focus (améliore l'UX)
      retry: 1, // Retry une fois en cas d'erreur
      refetchOnMount: false, // Ne pas refetch si les données sont fraîches
    },
    mutations: {
      retry: 0, // Pas de retry sur les mutations
    },
  },
});
