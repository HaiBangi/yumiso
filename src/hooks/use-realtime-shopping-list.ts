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
  timestamp: string;
}

export function useRealtimeShoppingList(planId: number | null) {
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
      if (!planId || !session?.user) return;

      const newState = !currentState;
      console.log(`[Realtime] Toggling ingredient: ${ingredientName} (${category}) from ${currentState} to ${newState}`);

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
        console.log(`[Realtime] Sending toggle request to server`);
        const response = await fetch("/api/shopping-list/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            ingredientName,
            category,
            isChecked: newState,
          }),
        });

        if (!response.ok) {
          throw new Error("Échec du toggle");
        }
        
        const result = await response.json();
        console.log(`[Realtime] Toggle response:`, result);
      } catch (error) {
        console.error(`[Realtime] Toggle error:`, error);
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
    [planId, session]
  );

  // Fonction pour ajouter un nouvel item à la liste
  const addItem = useCallback(
    async (ingredientName: string, category: string = "Autres"): Promise<{ success: boolean; error?: string }> => {
      if (!planId || !session?.user) return { success: false, error: "Non connecté" };

      const trimmedName = ingredientName.trim();
      if (!trimmedName) return { success: false, error: "Nom requis" };

      console.log(`[Realtime] Adding item: ${trimmedName} (${category})`);

      // Optimistic UI: ajouter immédiatement
      const key = `${trimmedName}-${category}`;
      const optimisticItem: ShoppingListItem = {
        id: Date.now(),
        ingredientName: trimmedName,
        category,
        isChecked: false,
        isManuallyAdded: true, // Les items ajoutés via cette fonction sont toujours manuels
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
          body: JSON.stringify({ planId, ingredientName: trimmedName, category }),
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
        console.error(`[Realtime] Add error:`, error);
        setItems((prev) => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        return { success: false, error: "Erreur lors de l'ajout" };
      }
    },
    [planId, session]
  );

  // Fonction pour supprimer un item de la liste
  const removeItem = useCallback(
    async (ingredientName: string, category: string): Promise<{ success: boolean; error?: string }> => {
      if (!planId || !session?.user) return { success: false, error: "Non connecté" };

      console.log(`[Realtime] Removing item: ${ingredientName} (${category})`);

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
          body: JSON.stringify({ planId, ingredientName, category }),
        });

        const result = await response.json();

        if (!response.ok) {
          // Rollback en cas d'erreur
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
        console.error(`[Realtime] Remove error:`, error);
        // Rollback en cas d'erreur
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
    [planId, session]
  );

  // Fonction pour déplacer un item vers une autre catégorie
  const moveItem = useCallback(
    async (ingredientName: string, fromCategory: string, toCategory: string): Promise<{ success: boolean; error?: string }> => {
      if (!planId || !session?.user) return { success: false, error: "Non connecté" };
      if (fromCategory === toCategory) return { success: true };

      console.log(`[Realtime] Moving item: ${ingredientName} from ${fromCategory} to ${toCategory}`);

      // Optimistic UI: déplacer immédiatement
      const oldKey = `${ingredientName}-${fromCategory}`;
      const newKey = `${ingredientName}-${toCategory}`;
      let previousItem: ShoppingListItem | undefined;
      
      setItems((prev) => {
        const newMap = new Map(prev);
        previousItem = newMap.get(oldKey);
        if (previousItem) {
          newMap.delete(oldKey);
          newMap.set(newKey, { ...previousItem, category: toCategory });
        }
        return newMap;
      });

      try {
        const response = await fetch("/api/shopping-list/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, ingredientName, fromCategory, toCategory }),
        });

        const result = await response.json();

        if (!response.ok) {
          // Rollback en cas d'erreur
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

        // Mettre à jour avec les données du serveur
        if (result.item) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(newKey, result.item);
            return newMap;
          });
        }

        return { success: true };
      } catch (error) {
        console.error(`[Realtime] Move error:`, error);
        // Rollback en cas d'erreur
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
    [planId, session]
  );

  // Connexion SSE
  useEffect(() => {
    if (!planId || !session?.user) {
      console.log('[Realtime] ⚠️ No planId or session, skipping connection');
      setIsLoading(false);
      return;
    }

    console.log(`[Realtime] 🔄 Initializing SSE for plan ${planId}`);
    let mounted = true;
    
    const connect = () => {
      if (!mounted) {
        console.log('[Realtime] Component unmounted, aborting connect');
        return;
      }

      // Nettoyer la connexion précédente
      if (eventSourceRef.current) {
        console.log('[Realtime] Closing previous EventSource');
        eventSourceRef.current.close();
      }

      console.log(`[Realtime] 📡 Creating EventSource for plan ${planId}`);
      const eventSource = new EventSource(
        `/api/shopping-list/subscribe/${planId}`
      );

      eventSource.onopen = () => {
        if (!mounted) return;
        console.log(`[Realtime] ✅ SSE OPENED for plan ${planId}`);
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      eventSource.onmessage = (event) => {
        if (!mounted) return;
        console.log(`[Realtime] 📨 Message received:`, event.data.substring(0, 100));
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          console.log(`[Realtime] Type: ${data.type}`);

          switch (data.type) {
            case "connected":
              console.log(`[Realtime] ✅ Connected to plan ${data.planId}`);
              break;

            case "initial":
              if (data.items) {
                console.log(`[Realtime] 📋 ${data.items.length} initial items`);
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
                console.log(`[Realtime] 🔄 "${data.item.ingredientName}" → ${data.item.isChecked ? '✅' : '⬜'} by ${data.userId}`);
                const key = `${data.item.ingredientName}-${data.item.category}`;
                setItems((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(key, data.item!);
                  console.log(`[Realtime] 💾 State updated (${newMap.size} items)`);
                  return newMap;
                });

                // Toast si autre utilisateur
                if (data.userId && data.userId !== session.user.id && data.userName) {
                  const action = data.item.isChecked ? "coché" : "décoché";
                  console.log(`[Realtime] 🔔 Toast: ${data.userName} a ${action}`);
                  toast.info(`${data.userName} a ${action} "${data.item.ingredientName}"`, {
                    duration: 3000,
                  });
                }
              }
              break;

            case "item_added":
              if (data.item) {
                console.log(`[Realtime] ➕ "${data.item.ingredientName}" added by ${data.userName}`);
                const key = `${data.item.ingredientName}-${data.item.category}`;
                setItems((prev) => {
                  const newMap = new Map(prev);
                  // Ne pas écraser si l'item existe déjà (optimistic UI)
                  if (!newMap.has(key)) {
                    newMap.set(key, data.item!);
                  }
                  console.log(`[Realtime] 💾 Item added (${newMap.size} items)`);
                  return newMap;
                });

                // Retirer de la liste des supprimés si présent
                setRemovedItemKeys((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(key);
                  return newSet;
                });

                // Toast si autre utilisateur
                if (data.userId && data.userId !== session.user.id && data.userName) {
                  console.log(`[Realtime] 🔔 Toast: ${data.userName} a ajouté`);
                  toast.info(`${data.userName} a ajouté "${data.item.ingredientName}"`, {
                    duration: 3000,
                  });
                }
              }
              break;

            case "item_removed":
              if (data.ingredientName && data.category) {
                console.log(`[Realtime] 🗑️ "${data.ingredientName}" removed by ${data.userName}`);
                const key = `${data.ingredientName}-${data.category}`;
                
                // Supprimer de la Map si présent
                setItems((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(key);
                  console.log(`[Realtime] 💾 Item removed from map (${newMap.size} items)`);
                  return newMap;
                });
                
                // Ajouter à la liste des supprimés (pour les items des recettes qui ne sont pas en base)
                setRemovedItemKeys((prev) => {
                  const newSet = new Set(prev);
                  newSet.add(key);
                  console.log(`[Realtime] 💾 Added to removedItemKeys (${newSet.size} items)`);
                  return newSet;
                });

                // Toast si autre utilisateur
                if (data.userId && data.userId !== session.user.id && data.userName) {
                  console.log(`[Realtime] 🔔 Toast: ${data.userName} a supprimé`);
                  toast.info(`${data.userName} a supprimé "${data.ingredientName}"`, {
                    duration: 3000,
                  });
                }
              }
              break;

            case "item_moved":
              if (data.item && data.fromCategory && data.toCategory) {
                console.log(`[Realtime] 🔄 "${data.item.ingredientName}" moved from ${data.fromCategory} to ${data.toCategory} by ${data.userName}`);
                const oldKey = `${data.item.ingredientName}-${data.fromCategory}`;
                const newKey = `${data.item.ingredientName}-${data.toCategory}`;
                setItems((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(oldKey);
                  newMap.set(newKey, data.item!);
                  console.log(`[Realtime] 💾 Item moved (${newMap.size} items)`);
                  return newMap;
                });

                // Toast si autre utilisateur
                if (data.userId && data.userId !== session.user.id && data.userName) {
                  console.log(`[Realtime] 🔔 Toast: ${data.userName} a déplacé`);
                  toast.info(`${data.userName} a déplacé "${data.item.ingredientName}" vers ${data.toCategory}`, {
                    duration: 3000,
                  });
                }
              }
              break;
          }
        } catch (error) {
          console.error("[Realtime] ❌ Parse error:", error);
        }
      };

      eventSource.onerror = () => {
        console.error(`[Realtime] ❌ ERROR. ReadyState: ${eventSource.readyState}`);
        setIsConnected(false);
        eventSource.close();

        if (!mounted) return;

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`[Realtime] 🔄 Retry in ${delay}ms (attempt ${reconnectAttempts + 1})`);
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
      console.log(`[Realtime] 🧹 Cleanup for plan ${planId}`);
      mounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [planId, session, reconnectAttempts]);

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