"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useSSE } from "@/lib/sse-manager";
import { flushSync } from "react-dom";

interface ShoppingListItem {
  id: number;
  ingredientName: string;
  category: string;
  storeId: number | null;
  store: { id: number; name: string; logoUrl: string | null; color: string; } | null;
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
  type: "connected" | "initial" | "ingredient_toggled" | "item_added" | "item_removed" | "item_moved" | "item_moved_store" | "item_edited" | "list_reset" | "checked_items_cleared";
  items?: ShoppingListItem[];
  item?: ShoppingListItem;
  ingredientName?: string;
  category?: string;
  fromCategory?: string;
  toCategory?: string;
  newStore?: string | null;
  userName?: string;
  userId?: string;
  planId?: number;
  listId?: number;
  deletedCount?: number;
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
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<number>>(new Set());

  // Queue pour traiter les toggles séquentiellement (évite race conditions)
  const [toggleQueue, setToggleQueue] = useState<Array<{ itemId: number; targetState: boolean }>>(
    []
  );
  const [isProcessingToggle, setIsProcessingToggle] = useState(false);
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

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
            setItems((prev) => {
              const newMap = new Map(prev);
              newMap.set(key, event.item!);
              return newMap;
            });

            // Si c'est l'utilisateur courant qui a ajouté l'item, ajouter le highlight
            if (event.userId === session?.user?.id) {
              setNewlyAddedIds((prev) => {
                const newSet = new Set(prev);
                newSet.add(event.item!.id);
                return newSet;
              });
            }

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
          // Le serveur envoie item avec le nouvel état + fromCategory/toCategory
          // L'ID est préservé, donc on met simplement à jour l'item par son ID
          if (event.item) {
            // Ignorer si c'est l'utilisateur qui a fait l'action (il a déjà l'optimistic UI)
            if (event.userId === session?.user?.id) {
              break;
            }

            const itemKey = `${event.item.id}`;
            setItems((prev) => {
              const newMap = new Map(prev);
              newMap.set(itemKey, event.item!);
              return newMap;
            });

            // Toast pour les autres utilisateurs
            if (event.userName) {
              toast.info(`${event.userName} a déplacé "${event.item.ingredientName}" vers ${event.toCategory}`);
            }
          }
          break;

        case 'item_moved_store':
          // L'item a été déplacé vers une nouvelle enseigne
          if (event.item) {
            const itemKey = `${event.item.id}`;
            const newStoreName = event.newStore || "Sans enseigne";
            const isOwnAction = event.userId === session?.user?.id;

            setItems((prev) => {
              const newMap = new Map(prev);
              newMap.set(itemKey, event.item!);
              return newMap;
            });

            // Toast uniquement pour les autres utilisateurs
            if (event.userName && !isOwnAction) {
              toast.info(`${event.userName} a déplacé "${event.item.ingredientName}" vers ${newStoreName}`);
            }
          }
          break;

        case 'item_edited':
          // L'item a été modifié
          if (event.item) {
            // Ignorer si c'est l'utilisateur qui a fait l'action (il a déjà l'optimistic UI)
            if (event.userId === session?.user?.id) {
              break;
            }

            const itemKey = `${event.item.id}`;
            setItems((prev) => {
              const newMap = new Map(prev);
              newMap.set(itemKey, event.item!);
              return newMap;
            });

            // Toast pour les autres utilisateurs
            if (event.userName) {
              toast.info(`${event.userName} a modifié un article`);
            }
          }
          break;

        case 'list_reset':
          setItems(new Map());
          if (event.userId && event.userId !== session?.user?.id && event.userName) {
            toast.info(`${event.userName} a réinitialisé la liste`);
          }
          break;

        case 'checked_items_cleared':
          // Supprimer tous les items cochés de la Map
          if (event.userId === session?.user?.id) {
            break;
          }

          setItems((prev) => {
            const newMap = new Map(prev);
            for (const [key, item] of newMap) {
              if (item.isChecked) {
                newMap.delete(key);
              }
            }
            return newMap;
          });

          if (event.userName) {
            toast.info(`${event.userName} a supprimé ${event.deletedCount || 0} article(s) coché(s)`);
          }
          break;
      }
    },
    (error) => {
      setIsConnected(false);
      toast.error('Connexion perdue, reconnexion en cours...');
    }
  );

  // useEffect pour traiter la queue automatiquement
  useEffect(() => {
    // Ne rien faire si déjà en cours de traitement, si la queue est vide, ou si un timer est déjà planifié
    if (isProcessingToggle || toggleQueue.length === 0 || !effectiveId || !session?.user || processingTimerRef.current) {
      return;
    }

    // Capturer les valeurs de la closure maintenant
    const capturedQueue = [...toggleQueue];
    const capturedPlanId = planId;
    const capturedListId = listId;
    const capturedSession = session;

    processingTimerRef.current = setTimeout(() => {
      (async () => {
        if (capturedQueue.length === 0) {
          processingTimerRef.current = null;
          return;
        }

        setIsProcessingToggle(true);

        const nextToggle = capturedQueue[0];
        const { itemId, targetState } = nextToggle;
        const key = `${itemId}`;

        let itemInfo = { ingredientName: '', category: '' };

        // Utiliser flushSync pour forcer l'exécution synchrone et capturer itemInfo
        flushSync(() => {
          setItems((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(key);

            if (!existing) {
              return prev;
            }

            // Capturer les infos de l'item DANS le callback synchrone
            itemInfo = {
              ingredientName: existing.ingredientName,
              category: existing.category,
            };

            newMap.set(key, {
              ...existing,
              isChecked: targetState,
              checkedAt: targetState ? new Date() : null,
              checkedByUserId: targetState ? capturedSession.user.id! : null,
              checkedByUser: targetState
                ? {
                    id: capturedSession.user.id!,
                    pseudo: capturedSession.user.pseudo || capturedSession.user.name || 'Anonyme',
                    name: capturedSession.user.name || null,
                  }
                : null,
            });

            return newMap;
          });
        });

        // Appel API - maintenant itemInfo est correctement rempli
        if (itemInfo.ingredientName) {
          try {
            const response = await fetch('/api/shopping-list/toggle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                planId: capturedPlanId || undefined,
                listId: capturedListId || undefined,
                ingredientName: itemInfo.ingredientName,
                category: itemInfo.category,
                isChecked: targetState,
              }),
            });

            if (!response.ok) {
              throw new Error('Échec du toggle');
            }
          } catch {
            // Rollback sur erreur
            flushSync(() => {
              setItems((prev) => {
                const newMap = new Map(prev);
                const existing = newMap.get(key);
                if (existing) {
                  newMap.set(key, {
                    ...existing,
                    isChecked: !targetState,
                    checkedAt: null,
                    checkedByUserId: null,
                    checkedByUser: null,
                  });
                }
                return newMap;
              });
            });
            toast.error('Erreur lors de la mise à jour');
          }
        }

        // Retirer l'item de la queue
        setToggleQueue((prev) => prev.slice(1));
        setIsProcessingToggle(false);
        processingTimerRef.current = null;
      })();
    }, 50);
  }, [toggleQueue, isProcessingToggle, effectiveId, planId, listId, session]);

  // Fonction pour toggle un ingrédient (ajoute à la queue)
  const toggleIngredient = useCallback(
    (itemId: number, currentState: boolean) => {
      if (!effectiveId || !session?.user) return;

      const targetState = !currentState;

      // Ajouter à la queue en évitant les doublons pour le même item
      setToggleQueue((prev) => {
        // Retirer les toggles précédents pour ce même item (garder seulement le dernier état voulu)
        const filtered = prev.filter((t) => t.itemId !== itemId);
        return [...filtered, { itemId, targetState }];
      });
    },
    [effectiveId, session]
  );

  // Fonction pour ajouter un ou plusieurs items à la liste (séparés par des virgules)
  const addItem = useCallback(
    async (ingredientName: string, category: string = "Autres", storeId?: number | null, storeName?: string | null): Promise<{ success: boolean; error?: string; addedCount?: number }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };

      // Parser les noms d'ingrédients séparés par des virgules
      const ingredientNames = ingredientName
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (ingredientNames.length === 0) return { success: false, error: "Nom requis" };

      const requestBody = {
        planId: planId || undefined,
        listId: listId || undefined,
        ingredientNames: ingredientNames.length > 1 ? ingredientNames : undefined,
        ingredientName: ingredientNames.length === 1 ? ingredientNames[0] : undefined,
        category,
        storeId: storeId ?? undefined,
        storeName: storeName ?? undefined
      };

      try {
        const response = await fetch("/api/shopping-list/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok) {
          return { success: false, error: result.error || "Erreur lors de l'ajout" };
        }

        // Les items arriveront via SSE
        return { success: true, addedCount: result.addedCount || ingredientNames.length };
      } catch {
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

      try {
        const response = await fetch("/api/shopping-list/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: planId || undefined,
            listId: listId || undefined,
            ingredientNames: items.map(i => i.name),
            isManuallyAdded: false,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          return { success: false, error: result.error || "Erreur lors de l'ajout" };
        }

        // Ajouter les items créés par le serveur
        if (result.items && Array.isArray(result.items)) {
          const newIds = new Set<number>();

          setItems((prev) => {
            const newMap = new Map(prev);
            result.items.forEach((item: ShoppingListItem) => {
              if (item && item.id) {
                const key = `${item.id}`;
                newMap.set(key, item);
                newIds.add(item.id);
              }
            });
            return newMap;
          });

          setNewlyAddedIds(newIds);
        }

        return { success: true, addedCount: result.addedCount || items.length };
      } catch {
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
      } catch {
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

      // Trouver l'item par nom+catégorie pour obtenir son ID
      const itemToMove = Array.from(items.values()).find(
        i => i.ingredientName === ingredientName && i.category === fromCategory
      );

      let previousItem: ShoppingListItem | undefined;
      let itemKey: string | null = null;

      setItems((prev) => {
        const newMap = new Map(prev);

        if (itemToMove) {
          itemKey = `${itemToMove.id}`;
          previousItem = newMap.get(itemKey);

          if (previousItem) {
            // Mettre à jour la catégorie (même clé)
            newMap.set(itemKey, { ...previousItem, category: toCategory });
          }
        } else {
          // Item non trouvé, créer un item optimiste (ne devrait pas arriver)
          const optimisticItem: ShoppingListItem = {
            id: Date.now(),
            ingredientName: ingredientName,
            category: toCategory,
            storeId: null,
            store: null,
            isChecked: false,
            isManuallyAdded: false,
            checkedAt: null,
            checkedByUserId: null,
            checkedByUser: null,
          };
          itemKey = `${optimisticItem.id}`;
          newMap.set(itemKey, optimisticItem);
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
          // Rollback: restaurer la catégorie précédente
          if (previousItem && itemKey) {
            setItems((prev) => {
              const newMap = new Map(prev);
              newMap.set(itemKey!, { ...previousItem!, category: fromCategory });
              return newMap;
            });
          }
          return { success: false, error: result.error || "Erreur lors du déplacement" };
        }

        // Mettre à jour avec la réponse du serveur si disponible
        if (result.item && itemKey) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(itemKey!, result.item);
            return newMap;
          });
        }

        return { success: true };
      } catch {
        // Rollback: restaurer la catégorie précédente
        if (previousItem && itemKey) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(itemKey!, { ...previousItem!, category: fromCategory });
            return newMap;
          });
        }
        return { success: false, error: "Erreur lors du déplacement" };
      }
    },
    [effectiveId, planId, listId, session, items]
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
      } catch {
        setItems(previousItems);
        return { success: false, error: "Erreur lors de la réinitialisation" };
      }
    },
    [listId, session, items]
  );

  // Fonction pour éditer un item (nom, quantité, catégorie)
  const editItem = useCallback(
    async (itemId: number, newName: string): Promise<{ success: boolean; error?: string }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };

      const key = `${itemId}`;
      let previousItem: ShoppingListItem | undefined;

      // Optimistic UI: mettre à jour immédiatement
      setItems((prev) => {
        const newMap = new Map(prev);
        previousItem = newMap.get(key);

        if (previousItem) {
          newMap.set(key, {
            ...previousItem,
            ingredientName: newName,
          });
        }

        return newMap;
      });

      if (!previousItem) {
        return { success: false, error: "Item non trouvé" };
      }

      try {
        const response = await fetch("/api/shopping-list/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: planId || undefined,
            listId: listId || undefined,
            itemId,
            name: newName,
          }),
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
          return { success: false, error: result.error || "Erreur lors de la modification" };
        }

        // Mettre à jour avec la réponse du serveur si disponible
        if (result.item) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, result.item);
            return newMap;
          });
        }

        return { success: true };
      } catch {
        // Rollback en cas d'erreur
        if (previousItem) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, previousItem!);
            return newMap;
          });
        }
        return { success: false, error: "Erreur lors de la modification" };
      }
    },
    [effectiveId, planId, listId, session]
  );

  // Fonction pour déplacer un item vers une autre enseigne
  const moveItemToStore = useCallback(
    async (itemId: number, newStoreId: number | null, newCategory?: string): Promise<{ success: boolean; error?: string }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };

      const key = `${itemId}`;
      let previousItem: ShoppingListItem | undefined;

      // Optimistic UI: mettre à jour immédiatement (storeId ET category si fournie)
      setItems((prev) => {
        const newMap = new Map(prev);
        previousItem = newMap.get(key);

        if (previousItem) {
          newMap.set(key, {
            ...previousItem,
            storeId: newStoreId,
            // Mettre à jour la category si fournie, sinon garder l'ancienne
            ...(newCategory !== undefined && { category: newCategory }),
          });
        }

        return newMap;
      });

      if (!previousItem) {
        return { success: false, error: "Item non trouvé" };
      }

      try {
        const response = await fetch("/api/shopping-list/move-store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: planId || undefined,
            listId: listId || undefined,
            itemId,
            storeId: newStoreId,
            category: newCategory || undefined,
          }),
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
          return { success: false, error: result.error || "Erreur lors du déplacement" };
        }

        // Mettre à jour avec la réponse du serveur si disponible
        if (result.item) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, result.item);
            return newMap;
          });
        }

        return { success: true };
      } catch {
        // Rollback en cas d'erreur
        if (previousItem) {
          setItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, previousItem!);
            return newMap;
          });
        }
        return { success: false, error: "Erreur lors du déplacement" };
      }
    },
    [effectiveId, planId, listId, session]
  );

  // Fonction pour supprimer tous les items cochés
  const clearCheckedItems = useCallback(
    async (): Promise<{ success: boolean; error?: string; deletedCount?: number }> => {
      if (!effectiveId || !session?.user) return { success: false, error: "Non connecté" };

      let previousItems: Map<string, ShoppingListItem> = new Map();
      const checkedKeys: string[] = [];

      // Optimistic UI: supprimer les items cochés immédiatement
      setItems((prev) => {
        previousItems = new Map(prev);
        const newMap = new Map(prev);

        for (const [key, item] of newMap) {
          if (item.isChecked) {
            checkedKeys.push(key);
            newMap.delete(key);
          }
        }

        return newMap;
      });

      // Attendre que le state soit mis à jour
      await new Promise(resolve => setTimeout(resolve, 0));

      if (checkedKeys.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      try {
        const response = await fetch("/api/shopping-list/clear-checked", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: planId || undefined,
            listId: listId || undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setItems(previousItems);
          return { success: false, error: result.error || "Erreur lors de la suppression" };
        }

        return { success: true, deletedCount: result.deletedCount };
      } catch {
        setItems(previousItems);
        return { success: false, error: "Erreur lors de la suppression" };
      }
    },
    [effectiveId, planId, listId, session]
  );

  // Mémoiser le tableau d'items pour éviter de créer un nouveau tableau à chaque render
  const itemsArray = useMemo(() => Array.from(items.values()), [items]);

  // Fonction pour marquer manuellement un item comme "plus nouveau"
  const clearNewlyAdded = useCallback((itemId: number) => {
    setNewlyAddedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  // Fonction pour obtenir la liste des enseignes disponibles (utilisées)
  const availableStores = useMemo(() => {
    const storesMap = new Map<number, { id: number; name: string; logoUrl: string | null; color: string; isActive: boolean; isGlobal?: boolean; displayOrder: number }>();
    Array.from(items.values()).forEach(item => {
      if (item.store) {
        // Utiliser l'ID comme clé pour éviter les doublons
        storesMap.set(item.store.id, {
          id: item.store.id,
          name: item.store.name,
          logoUrl: item.store.logoUrl,
          color: item.store.color,
          isActive: true, // Les stores dans les items sont forcément actifs
          isGlobal: (item.store as any).isGlobal, // Copier isGlobal si pr��sent
          displayOrder: 0, // Ordre par défaut, sera trié par nom
        });
      }
    });
    return Array.from(storesMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [items]);

  return {
    items: itemsArray,
    removedItemKeys,
    newlyAddedIds, // Set des IDs nouvellement ajoutés
    clearNewlyAdded, // Fonction pour retirer manuellement le highlight
    toggleIngredient,
    addItem,
    addItems, // Fonction batch pour ajouter plusieurs items sans split
    removeItem,
    moveItem,
    editItem, // Fonction pour éditer un item
    moveItemToStore, // Fonction pour déplacer un item vers une autre enseigne
    resetList,
    clearCheckedItems, // Fonction pour supprimer les items cochés
    availableStores, // Liste des enseignes disponibles
    isConnected,
    isLoading,
  };
}
