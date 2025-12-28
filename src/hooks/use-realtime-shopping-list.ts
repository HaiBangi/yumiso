"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface ShoppingListItem {
  id: number;
  ingredientName: string;
  category: string;
  isChecked: boolean;
  isManuallyAdded: boolean;
  checkedAt: Date | null;
  checkedByUserId: string | null;
  checkedByUser: {
    id: string;
    pseudo: string;
    name: string | null;
  } | null;
}

interface RealtimeEvent {
  type: "connected" | "initial" | "ingredient_toggled" | "item_added" | "item_removed" | "item_moved";
  items?: ShoppingListItem[];
  item?: ShoppingListItem;
  ingredientName?: string;
  category?: string;
  fromCategory?: string;
  toCategory?: string;
  userName?: string;
  userId?: string;
  planId?: number;
  listId?: number;
  timestamp: string;
}

interface UseRealtimeShoppingListOptions {
  planId?: number | null;  // Pour les listes liées à un menu
  listId?: number | null;  // Pour les listes indépendantes
}

export function useRealtimeShoppingList(
  planIdOrOptions: number | null | UseRealtimeShoppingListOptions
) {
  // Support both old signature (planId: number | null) and new signature (options)
  const options: UseRealtimeShoppingListOptions = typeof planIdOrOptions === 'object' && planIdOrOptions !== null && !Array.isArray(planIdOrOptions) && ('planId' in planIdOrOptions || 'listId' in planIdOrOptions)
    ? planIdOrOptions
    : { planId: planIdOrOptions as number | null };
  
  const { planId, listId } = options;
  const effectiveId = planId || listId;
  
  const { data: session } = useSession();
  const [items, setItems] = useState<Map<string, ShoppingListItem>>(new Map());
  const [removedItemKeys, setRemovedItemKeys] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Fonction pour toggle un ingrédient
  const toggleIngredient = useCallback(
    async (ingredientName: string, category: string, currentState: boolean) => {
      if (!effectiveId || !session?.user) return;

      const newState = !currentState;

      // Optimistic UI: mettre à jour immédiatement
      const key = `${ingredientName}-${category}`;
      setItems((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(key);
        if (existing) {
          newMap.set(key, {
            ...existing,
            isChecked: newState,
            checkedAt: newState ? new Date() : null,
            checkedByUserId: newState ? session.user.id! : null,
            checkedByUser: newState
              ? {
                  id: session.user.id!,
                  pseudo: session.user.pseudo || session.user.name || "Anonyme",
                  name: session.user.name || null,
                }
              : null,
          });
        }
        return newMap;
      });

      // Envoyer la requête au serveur
      try {
        const response = await fetch("/api/shopping-list/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: planId || undefined,
            listId: listId || undefined,
            ingredientName,
            category,
            isChecked: newState,
          }),
        });

        if (!response.ok) {
          throw new Error("Échec du toggle");
        }
      } catch (error) {
        console.error("Toggle error:", error);
        // Rollback en cas d'erreur
        setItems((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(key);
          if (existing) {
            newMap.set(key, {
              ...existing,
              isChecked: currentState,
            });
          }
          return newMap;
        });
        toast.error("Erreur lors de la mise à jour");
      }
    },
    [effectiveId, planId, listId, session]
  );

  // Fonction pour ajouter un nouvel item à la liste
  const addItem = useCallback(
    async (ingredientName: string, category: string = "Autres"): Promise<{ success: boolean; error?: string }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };

      const trimmedName = ingredientName.trim();
      if (!trimmedName) return { success: false, error: "Nom requis" };

      // Optimistic UI: ajouter immédiatement
      const key = `${trimmedName}-${category}`;
      const optimisticItem: ShoppingListItem = {
        id: Date.now(),
        ingredientName: trimmedName,
        category,
        isChecked: false,
        isManuallyAdded: true,
        checkedAt: null,
        checkedByUserId: null,
        checkedByUser: null,
      };

      setItems((prev) => {
        const newMap = new Map(prev);
        if (!newMap.has(key)) {
          newMap.set(key, optimisticItem);
        }
        return newMap;
      });

      try {
        const response = await fetch("/api/shopping-list/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            planId: planId || undefined, 
            listId: listId || undefined, 
            ingredientName: trimmedName, 
            category 
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.delete(key);
            return newMap;
          });
          return { success: false, error: result.error || "Erreur lors de l'ajout" };
        }

        setItems((prev) => {
          const newMap = new Map(prev);
          newMap.set(key, result.item);
          return newMap;
        });

        return { success: true };
      } catch (error) {
        console.error("Add error:", error);
        setItems((prev) => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        return { success: false, error: "Erreur lors de l'ajout" };
      }
    },
    [effectiveId, planId, listId, session]
  );

  // Fonction pour supprimer un item de la liste
  const removeItem = useCallback(
    async (ingredientName: string, category: string): Promise<{ success: boolean; error?: string }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };

      // Optimistic UI: supprimer immédiatement
      const key = `${ingredientName}-${category}`;
      let previousItem: ShoppingListItem | undefined;
      
      setItems((prev) => {
        const newMap = new Map(prev);
        previousItem = newMap.get(key);
        newMap.delete(key);
        return newMap;
      });

      try {
        const response = await fetch("/api/shopping-list/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            planId: planId || undefined, 
            listId: listId || undefined, 
            ingredientName, 
            category 
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (previousItem) {
            setItems((prev) => {
              const newMap = new Map(prev);
              newMap.set(key, previousItem!);
              return newMap;
            });
          }
          return { success: false, error: result.error || "Erreur lors de la suppression" };
        }

        return { success: true };
      } catch (error) {
        console.error("Remove error:", error);
        if (previousItem) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, previousItem!);
            return newMap;
          });
        }
        return { success: false, error: "Erreur lors de la suppression" };
      }
    },
    [effectiveId, planId, listId, session]
  );

  // Fonction pour déplacer un item vers une autre catégorie
  const moveItem = useCallback(
    async (ingredientName: string, fromCategory: string, toCategory: string): Promise<{ success: boolean; error?: string }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };
      if (fromCategory === toCategory) return { success: true };

      const oldKey = `${ingredientName}-${fromCategory}`;
      const newKey = `${ingredientName}-${toCategory}`;
      let previousItem: ShoppingListItem | undefined;
      
      setItems((prev) => {
        const newMap = new Map(prev);
        previousItem = newMap.get(oldKey);
        
        if (previousItem) {
          newMap.delete(oldKey);
          newMap.set(newKey, { ...previousItem, category: toCategory });
        } else {
          const optimisticItem: ShoppingListItem = {
            id: Date.now(),
            ingredientName: ingredientName,
            category: toCategory,
            isChecked: false,
            isManuallyAdded: false,
            checkedAt: null,
            checkedByUserId: null,
            checkedByUser: null,
          };
          newMap.set(newKey, optimisticItem);
        }
        return newMap;
      });

      try {
        const response = await fetch("/api/shopping-list/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            planId: planId || undefined, 
            listId: listId || undefined, 
            ingredientName, 
            fromCategory, 
            toCategory 
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (previousItem) {
            setItems((prev) => {
              const newMap = new Map(prev);
              newMap.delete(newKey);
              newMap.set(oldKey, previousItem!);
              return newMap;
            });
          }
          return { success: false, error: result.error || "Erreur lors du déplacement" };
        }

        if (result.item) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(newKey, result.item);
            return newMap;
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Move error:", error);
        if (previousItem) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.delete(newKey);
            newMap.set(oldKey, previousItem!);
            return newMap;
          });
        }
        return { success: false, error: "Erreur lors du déplacement" };
      }
    },
    [effectiveId, planId, listId, session]
  );

  // Connexion SSE
  useEffect(() => {
    if (!effectiveId || !session?.user) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    
    const connect = () => {
      if (!mounted) return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Ajouter un paramètre de type pour distinguer planId et listId
      const typeParam = planId ? 'plan' : 'list';
      const eventSource = new EventSource(
        `/api/shopping-list/subscribe/${effectiveId}?type=${typeParam}`
      );

      eventSource.onopen = () => {
        if (!mounted) return;
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      eventSource.onmessage = (event) => {
        if (!mounted) return;
        try {
          const data: RealtimeEvent = JSON.parse(event.data);

          switch (data.type) {
            case "connected":
              break;

            case "initial":
              if (data.items) {
                const newMap = new Map<string, ShoppingListItem>();
                data.items.forEach((item) => {
                  const key = `${item.ingredientName}-${item.category}`;
                  newMap.set(key, item);
                });
                setItems(newMap);
                setIsLoading(false);
              }
              break;

            case "ingredient_toggled":
              if (data.item) {
                const key = `${data.item.ingredientName}-${data.item.category}`;
                setItems((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(key, data.item!);
                  return newMap;
                });

                if (data.userId && data.userId !== session.user.id && data.userName) {
                  const action = data.item.isChecked ? "coché" : "décoché";
                  toast.info(`${data.userName} a ${action} "${data.item.ingredientName}"`, {
                    duration: 3000,
                  });
                }
              }
              break;

            case "item_added":
              if (data.item) {
                const key = `${data.item.ingredientName}-${data.item.category}`;
                setItems((prev) => {
                  const newMap = new Map(prev);
                  if (!newMap.has(key)) {
                    newMap.set(key, data.item!);
                  }
                  return newMap;
                });

                setRemovedItemKeys((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(key);
                  return newSet;
                });

                if (data.userId && data.userId !== session.user.id && data.userName) {
                  toast.info(`${data.userName} a ajouté "${data.item.ingredientName}"`, {
                    duration: 3000,
                  });
                }
              }
              break;

            case "item_removed":
              if (data.ingredientName && data.category) {
                const key = `${data.ingredientName}-${data.category}`;
                
                setItems((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(key);
                  return newMap;
                });
                
                setRemovedItemKeys((prev) => {
                  const newSet = new Set(prev);
                  newSet.add(key);
                  return newSet;
                });

                if (data.userId && data.userId !== session.user.id && data.userName) {
                  toast.info(`${data.userName} a supprimé "${data.ingredientName}"`, {
                    duration: 3000,
                  });
                }
              }
              break;

            case "item_moved":
              if (data.item && data.fromCategory && data.toCategory) {
                const oldKey = `${data.item.ingredientName}-${data.fromCategory}`;
                const newKey = `${data.item.ingredientName}-${data.toCategory}`;
                setItems((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(oldKey);
                  newMap.set(newKey, data.item!);
                  return newMap;
                });

                if (data.userId && data.userId !== session.user.id && data.userName) {
                  toast.info(`${data.userName} a déplacé "${data.item.ingredientName}" vers ${data.toCategory}`, {
                    duration: 3000,
                  });
                }
              }
              break;
          }
        } catch (error) {
          console.error("SSE parse error:", error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        if (!mounted) return;

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mounted) {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }
        }, delay);
      };

      eventSourceRef.current = eventSource;
    };

    connect();

    return () => {
      mounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [effectiveId, planId, session, reconnectAttempts]);

  return {
    items: Array.from(items.values()),
    removedItemKeys,
    toggleIngredient,
    addItem,
    removeItem,
    moveItem,
    isConnected,
    isLoading,
  };
}
