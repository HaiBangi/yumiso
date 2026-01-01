"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useSSE } from "@/lib/sse-manager";

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
  type: "connected" | "initial" | "ingredient_toggled" | "item_added" | "item_removed" | "item_moved" | "list_reset";
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

  // Construire l'URL SSE si on a un ID
  const sseUrl = effectiveId
    ? `/api/shopping-list/subscribe/${effectiveId}?type=${listId ? 'list' : 'plan'}`
    : null;

  // Se connecter au flux SSE avec le SSE Manager
  useSSE<RealtimeEvent>(
    sseUrl,
    (event) => {
      // Gérer les événements temps réel
      switch (event.type) {
        case 'connected':
          setIsConnected(true);
          break;

        case 'initial':
          if (event.items) {
            const itemsMap = new Map<string, ShoppingListItem>();
            event.items.forEach((item) => {
              // Utiliser l'ID unique comme clé pour permettre les doublons
              const key = `${item.id}`;
              itemsMap.set(key, item);
            });
            console.log(`[useRealtimeShoppingList] Initial: ${itemsMap.size} items chargés`);
            setItems(itemsMap);
          }
          setIsLoading(false);
          break;

        case 'ingredient_toggled':
          if (event.item) {
            const key = `${event.item.id}`;
            setItems((prev) => {
              const newMap = new Map(prev);
              newMap.set(key, event.item!);
              return newMap;
            });

            // Toast si quelqu'un d'autre a toggle
            if (event.userId && event.userId !== session?.user?.id && event.userName) {
              const action = event.item.isChecked ? 'a coché' : 'a décoché';
              toast.info(`${event.userName} ${action} "${event.item.ingredientName}"`);
            }
          }
          break;

        case 'item_added':
          if (event.item) {
            const key = `${event.item.id}`;
            console.log(`[SSE item_added] Item ID ${key}: "${event.item.ingredientName}"`);
            setItems((prev) => {
              const newMap = new Map(prev);
              const existed = newMap.has(key);
              console.log(`[SSE item_added] Item ${key} ${existed ? 'EXISTE DÉJÀ' : 'est nouveau'} dans la Map (size: ${newMap.size})`);
              newMap.set(key, event.item!);
              console.log(`[SSE item_added] Map size après ajout: ${newMap.size}`);
              return newMap;
            });

            if (event.userId && event.userId !== session?.user?.id && event.userName) {
              toast.info(`${event.userName} a ajouté "${event.item.ingredientName}"`);
            }
          }
          break;

        case 'item_removed':
          // FIXME: L'événement SSE n'envoie pas itemId, utiliser ingredientName-category pour l'instant
          if (event.ingredientName && event.category) {
            // Trouver l'item par ingredientName et category
            const itemToRemove = Array.from(items.values()).find(
              i => i.ingredientName === event.ingredientName && i.category === event.category
            );

            if (itemToRemove) {
              const key = `${itemToRemove.id}`;
              setItems((prev) => {
                const newMap = new Map(prev);
                newMap.delete(key);
                return newMap;
              });
              setRemovedItemKeys((prev) => new Set(prev).add(key));
            }

            if (event.userId && event.userId !== session?.user?.id && event.userName) {
              toast.info(`${event.userName} a supprimé "${event.ingredientName}"`);
            }
          }
          break;

        case 'item_moved':
          if (event.ingredientName && event.fromCategory && event.toCategory) {
            const oldKey = `${event.ingredientName}-${event.fromCategory}`;
            const newKey = `${event.ingredientName}-${event.toCategory}`;

            setItems((prev) => {
              const newMap = new Map(prev);
              const item = newMap.get(oldKey);
              if (item) {
                newMap.delete(oldKey);
                newMap.set(newKey, { ...item, category: event.toCategory! });
              }
              return newMap;
            });
          }
          break;

        case 'list_reset':
          setItems(new Map());
          if (event.userId && event.userId !== session?.user?.id && event.userName) {
            toast.info(`${event.userName} a réinitialisé la liste`);
          }
          break;

        default:
          console.log('[SSE] Unknown event type:', event.type);
      }
    },
    (error) => {
      console.error('[SSE] Connection error:', error);
      setIsConnected(false);
      toast.error('Connexion perdue, reconnexion en cours...');
    }
  );

  // Fonction pour toggle un ingrédient
  const toggleIngredient = useCallback(
    async (itemId: number, currentState: boolean) => {
      if (!effectiveId || !session?.user) return;

      const newState = !currentState;

      // Trouver l'item pour obtenir ingredientName et category (nécessaire pour l'API actuelle)
      const key = `${itemId}`;
      const item = items.get(key);
      if (!item) {
        console.error('[toggleIngredient] Item non trouvé:', itemId);
        return;
      }

      const ingredientName = item.ingredientName;
      const category = item.category;

      // Optimistic UI: mettre à jour immédiatement
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

  // Fonction pour ajouter un ou plusieurs items à la liste (séparés par des virgules)
  const addItem = useCallback(
    async (ingredientName: string, category: string = "Autres"): Promise<{ success: boolean; error?: string; addedCount?: number }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };

      // Parser les noms d'ingrédients séparés par des virgules
      const ingredientNames = ingredientName
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (ingredientNames.length === 0) return { success: false, error: "Nom requis" };

      try {
        const response = await fetch("/api/shopping-list/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: planId || undefined,
            listId: listId || undefined,
            ingredientNames: ingredientNames.length > 1 ? ingredientNames : undefined,
            ingredientName: ingredientNames.length === 1 ? ingredientNames[0] : undefined,
            category
          }),
        });

        const result = await response.json();

        console.log('[addItem] Réponse API:', result);
        console.log('[addItem] Items reçus:', result.items?.length || 0);

        if (!response.ok) {
          return { success: false, error: result.error || "Erreur lors de l'ajout" };
        }

        // NE PAS ajouter les items ici, ils arriveront via SSE
        // Cela évite les doublons temporaires (ajout via HTTP + SSE avec des clés différentes)
        console.log('[addItem] ✅ Items seront ajoutés via SSE uniquement');

        return { success: true, addedCount: result.addedCount || ingredientNames.length };
      } catch (error) {
        console.error("Add error:", error);
        return { success: false, error: "Erreur lors de l'ajout" };
      }
    },
    [effectiveId, planId, listId, session]
  );

  // Fonction pour ajouter plusieurs items en batch (optimisé, SANS split par virgule)
  const addItems = useCallback(
    async (items: Array<{ name: string; category: string }>): Promise<{ success: boolean; error?: string; addedCount?: number }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };
      if (items.length === 0) return { success: false, error: "Aucun ingrédient" };

      console.log('[addItems Hook] Envoi de', items.length, 'ingrédients');

      try {
        const response = await fetch("/api/shopping-list/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: planId || undefined,
            listId: listId || undefined,
            ingredientNames: items.map(i => i.name), // Pas de split, juste mapper les noms
            isManuallyAdded: false, // false car vient des recettes
          }),
        });

        const result = await response.json();

        console.log('[addItems Hook] Réponse API:', result);
        console.log('[addItems Hook] Items reçus:', result.items?.length || 0);

        if (!response.ok) {
          return { success: false, error: result.error || "Erreur lors de l'ajout" };
        }

        // Ajouter les items créés par le serveur
        if (result.items && Array.isArray(result.items)) {
          console.log('[addItems Hook] Mise à jour du state avec', result.items.length, 'items');
          setItems((prev) => {
            const newMap = new Map(prev);
            console.log('[addItems Hook] Taille Map avant:', newMap.size);
            result.items.forEach((item: ShoppingListItem) => {
              if (item && item.id) {
                // Utiliser l'ID unique comme clé pour permettre les doublons
                const key = `${item.id}`;
                console.log('[addItems Hook] Ajout item:', key, item.ingredientName, 'isManuallyAdded:', item.isManuallyAdded);
                newMap.set(key, item);
              }
            });
            console.log('[addItems Hook] Taille Map après:', newMap.size);
            return newMap;
          });
        } else {
          console.warn('[addItems Hook] Pas d\'items dans la réponse');
        }

        return { success: true, addedCount: result.addedCount || items.length };
      } catch (error) {
        console.error("Add items error:", error);
        return { success: false, error: "Erreur lors de l'ajout" };
      }
    },
    [effectiveId, planId, listId, session]
  );

  // Fonction pour supprimer un item de la liste
  const removeItem = useCallback(
    async (itemId: number): Promise<{ success: boolean; error?: string }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };

      // Optimistic UI: supprimer immédiatement
      const key = `${itemId}`;
      let previousItem: ShoppingListItem | undefined;

      setItems((prev) => {
        const newMap = new Map(prev);
        previousItem = newMap.get(key);
        newMap.delete(key);
        return newMap;
      });

      if (!previousItem) {
        return { success: false, error: "Item non trouvé" };
      }

      const ingredientName = previousItem.ingredientName;
      const category = previousItem.category;

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

  // Fonction pour réinitialiser la liste (uniquement pour les listes indépendantes)
  const resetList = useCallback(
    async (): Promise<{ success: boolean; error?: string; deletedCount?: number }> => {
      if (!listId || !session?.user) return { success: false, error: "Non connecté ou liste non valide" };

      // Optimistic UI: vider la liste immédiatement
      const previousItems = new Map(items);
      setItems(new Map());
      setRemovedItemKeys(new Set());

      try {
        const response = await fetch(`/api/shopping-lists/${listId}/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const result = await response.json();

        if (!response.ok) {
          // Rollback en cas d'erreur
          setItems(previousItems);
          return { success: false, error: result.error || "Erreur lors de la réinitialisation" };
        }

        return { success: true, deletedCount: result.deletedCount };
      } catch (error) {
        console.error("Reset error:", error);
        // Rollback en cas d'erreur
        setItems(previousItems);
        return { success: false, error: "Erreur lors de la réinitialisation" };
      }
    },
    [listId, session, items]
  );

  return {
    items: Array.from(items.values()),
    removedItemKeys,
    toggleIngredient,
    addItem,
    addItems, // Fonction batch pour ajouter plusieurs items sans split
    removeItem,
    moveItem,
    resetList,
    isConnected,
    isLoading,
  };
}
