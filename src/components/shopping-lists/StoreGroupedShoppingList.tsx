"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Store as StoreIcon } from "lucide-react";
import { ShoppingListContent, ShoppingItem } from "./shopping-list-content";
import { StoreManagementMenu } from "./StoreManagementMenu";
import { RenameNoStoreMenu } from "./RenameNoStoreMenu";
import type { Store } from "@/types/store";

interface StoreGroupedShoppingListProps {
  // Structure: { [storeName]: { [category]: items[] } }
  itemsByStore: Record<string, Record<string, ShoppingItem[]>>;
  onToggleItem: (itemId: number, isChecked: boolean) => void;
  onAddItem?: (itemName: string, category: string, storeId?: number | null) => Promise<{ success: boolean; error?: string }>;
  onRemoveItem?: (itemId: number) => Promise<{ success: boolean; error?: string }>;
  onMoveItem?: (itemName: string, fromCategory: string, toCategory: string) => Promise<{ success: boolean; error?: string }>;
  onEditItem?: (itemId: number, newName: string) => Promise<{ success: boolean; error?: string }>;
  onMoveItemToStore?: (itemId: number, newStoreId: number | null, newCategory?: string) => Promise<{ success: boolean; error?: string }>;
  showAddForm?: boolean;
  accentColor?: "emerald" | "blue";
  isLoading?: boolean;
  newlyAddedIds?: Set<number>;
  availableStores?: Store[];
}

export function StoreGroupedShoppingList({
  itemsByStore,
  onToggleItem,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onEditItem,
  onMoveItemToStore,
  showAddForm = true,
  accentColor = "emerald",
  isLoading = false,
  newlyAddedIds = new Set(),
  availableStores = [],
}: StoreGroupedShoppingListProps) {
  // État pour gérer les enseignes ouvertes/fermées
  const [expandedStores, setExpandedStores] = useState<Set<string>>(
    () => new Set(Object.keys(itemsByStore)) // Par défaut, toutes les enseignes sont ouvertes
  );

  // Ouvrir automatiquement les nouvelles enseignes qui apparaissent
  useEffect(() => {
    const currentStores = Object.keys(itemsByStore);
    setExpandedStores(prev => {
      const newSet = new Set(prev);
      let hasChanges = false;

      // Ajouter les nouvelles enseignes
      currentStores.forEach(store => {
        if (!newSet.has(store)) {
          newSet.add(store);
          hasChanges = true;
        }
      });

      // Retirer les enseignes qui n'existent plus
      Array.from(newSet).forEach(store => {
        if (!currentStores.includes(store)) {
          newSet.delete(store);
          hasChanges = true;
        }
      });

      return hasChanges ? newSet : prev;
    });
  }, [itemsByStore]);

  // État pour le drag & drop entre enseignes
  const [draggedItem, setDraggedItem] = useState<{ itemId: number; itemName: string; fromStore: string; fromCategory: string } | null>(null);
  const [dragOverStore, setDragOverStore] = useState<string | null>(null);

  const toggleStore = (storeName: string) => {
    setExpandedStores(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storeName)) {
        newSet.delete(storeName);
      } else {
        newSet.add(storeName);
      }
      return newSet;
    });
  };

  // Trier les enseignes : "Sans enseigne" en dernier, les autres par ordre alphabétique
  const sortedStores = Object.keys(itemsByStore).sort((a, b) => {
    if (a === "Sans enseigne") return 1;
    if (b === "Sans enseigne") return -1;
    return a.localeCompare(b, 'fr');
  });

  // Calculer les enseignes présentes dans la liste actuelle
  const storesInList = new Set<string>(sortedStores);

  // Handler pour démarrer le drag d'un item (appelé depuis ShoppingListContent)
  const handleItemDragStart = (itemId: number, itemName: string, fromStore: string, fromCategory: string) => {
    console.log('[StoreGrouped] 🚀 Drag start:', { itemId, itemName, fromStore, fromCategory });
    setDraggedItem({ itemId, itemName, fromStore, fromCategory });
  };

  // Handler pour terminer le drag
  const handleItemDragEnd = () => {
    console.log('[StoreGrouped] 🏁 Drag end');
    setDraggedItem(null);
    setDragOverStore(null);
  };

  // Handler pour le drag over sur une enseigne
  const handleStoreDragOver = (e: React.DragEvent, storeName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStore(storeName);
  };

  // Handler pour le drag leave sur une enseigne
  const handleStoreDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Vérifier si on quitte vraiment l'enseigne (pas juste un enfant)
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverStore(null);
    }
  };

  // Handler pour le drop sur une enseigne
  const handleStoreDrop = async (e: React.DragEvent, toStore: string, toCategory?: string) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('[StoreGrouped] 📥 Drop sur enseigne:', toStore, 'catégorie:', toCategory);

    if (!draggedItem || !onMoveItemToStore) {
      console.log('[StoreGrouped] ⚠️ Pas de draggedItem ou onMoveItemToStore');
      setDraggedItem(null);
      setDragOverStore(null);
      return;
    }

    console.log('[StoreGrouped] Item dragué:', draggedItem);

    // Ne rien faire si c'est la même enseigne ET même catégorie
    if (draggedItem.fromStore === toStore && (!toCategory || draggedItem.fromCategory === toCategory)) {
      console.log('[StoreGrouped] ⏭️ Même enseigne et catégorie, rien à faire');
      setDraggedItem(null);
      setDragOverStore(null);
      return;
    }

    // IMPORTANT: Nettoyer l'état de drag IMMÉDIATEMENT pour éviter l'effet "fantôme"
    // On sauvegarde les infos nécessaires avant de nettoyer
    const itemId = draggedItem.itemId;
    const fromCategory = draggedItem.fromCategory;

    // Nettoyer l'état visuel tout de suite
    setDraggedItem(null);
    setDragOverStore(null);

    // Trouver l'ID de l'enseigne cible
    const targetStore = availableStores?.find(s => s.name === toStore);
    const newStoreId = toStore === "Sans enseigne" ? null : (targetStore?.id || null);

    // Toujours passer la catégorie pour préserver celle d'origine si elle ne change pas
    const categoryToUse = toCategory || fromCategory;

    // Exécuter l'opération async après avoir nettoyé l'UI
    try {
      if (toCategory && toCategory !== fromCategory) {
        console.log('[StoreGrouped] ✅ Changement enseigne ET catégorie');
        await onMoveItemToStore(itemId, newStoreId, categoryToUse);
      } else {
        console.log('[StoreGrouped] ℹ️ Changement enseigne seulement (catégorie préservée)');
        await onMoveItemToStore(itemId, newStoreId, categoryToUse);
      }
    } catch (error) {
      console.error('[StoreGrouped] ❌ Erreur lors du déplacement:', error);
    }
  };

  if (sortedStores.length === 0 && !isLoading) {
    return null; // Sera géré par le composant parent (état vide)
  }

  return (
    <div className="space-y-4">
      {/* Formulaire d'ajout en haut */}
      {showAddForm && onAddItem && (
        <div className="mb-6">
          {/* Le formulaire sera affiché ici par le parent via ShoppingListContent */}
        </div>
      )}

      {/* Enseignes */}
      {sortedStores.map(storeName => {
        const storeCategories = itemsByStore[storeName];
        const isExpanded = expandedStores.has(storeName);
        const itemCount = Object.values(storeCategories).reduce((total, items) => total + items.length, 0);
        const isDragOver = dragOverStore === storeName;

        // Trouver le store pour obtenir le logo
        const storeData = availableStores?.find(s => s.name === storeName);
        const storeLogo = storeData?.logoUrl;

        return (
          <div
            key={storeName}
            className={`bg-white dark:bg-stone-900 rounded-xl shadow-sm border transition-all ${
              isDragOver
                ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20'
                : 'border-stone-200 dark:border-stone-700'
            } overflow-hidden`}
            onDragOver={(e) => handleStoreDragOver(e, storeName)}
            onDragLeave={handleStoreDragLeave}
            onDrop={(e) => handleStoreDrop(e, storeName)}
          >
            {/* Header de l'enseigne */}
            <div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3">
              {/* Bouton toggle expand/collapse */}
              <button
                onClick={() => toggleStore(storeName)}
                className="flex-shrink-0 hover:bg-stone-100 dark:hover:bg-stone-700 rounded p-1 transition-colors"
                aria-label={isExpanded ? "Réduire" : "Développer"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-6 w-6 text-stone-500 dark:text-stone-400" />
                ) : (
                  <ChevronRight className="h-6 w-6 text-stone-500 dark:text-stone-400" />
                )}
              </button>

              {/* Nom et logo de l'enseigne - cliquable */}
              <button
                onClick={() => toggleStore(storeName)}
                className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
              >
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="h-6 w-6 flex-shrink-0 object-contain" />
                ) : (
                  <StoreIcon className="h-6 w-6 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                )}
                <h3 className="font-semibold text-base sm:text-lg truncate text-stone-900 dark:text-stone-100">
                  {storeName}
                </h3>
              </button>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-stone-500 dark:text-stone-400">
                  {itemCount} article{itemCount > 1 ? 's' : ''}
                </span>

                {/* Menu pour "Sans enseigne" - créer une enseigne */}
                {storeName === "Sans enseigne" && (
                  <RenameNoStoreMenu
                    itemIds={Object.values(storeCategories).flat().map(item => item.id)}
                  />
                )}

                {/* Menu de gestion de l'enseigne (uniquement pour les enseignes perso) */}
                {storeData && storeData.isGlobal !== true && storeName !== "Sans enseigne" && (
                  <StoreManagementMenu
                    storeId={storeData.id}
                    storeName={storeData.name}
                    isGlobal={storeData.isGlobal ?? false}
                  />
                )}
              </div>
            </div>

            {/* Contenu de l'enseigne (catégories) */}
            {isExpanded && (
              <div className="px-2 sm:px-3 pb-3 sm:pb-4 pt-1">
                <ShoppingListContent
                  items={storeCategories}
                  onToggleItem={onToggleItem}
                  onRemoveItem={onRemoveItem}
                  onMoveItem={onMoveItem}
                  onEditItem={onEditItem}
                  onMoveItemToStore={onMoveItemToStore}
                  showAddForm={false} // Pas de formulaire dans chaque enseigne
                  gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4"
                  accentColor={accentColor}
                  isLoading={false}
                  newlyAddedIds={newlyAddedIds}
                  availableStores={availableStores}
                  storeName={storeName}
                  storesInList={storesInList}
                  // Props pour le drag & drop global
                  draggedItemGlobal={draggedItem}
                  onItemDragStart={(itemId: number, itemName: string, fromCategory: string) => handleItemDragStart(itemId, itemName, storeName, fromCategory)}
                  onItemDragEnd={handleItemDragEnd}
                  onStoreDrop={(toCategory: string) => {
                    const fakeEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.DragEvent;
                    handleStoreDrop(fakeEvent, storeName, toCategory);
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
