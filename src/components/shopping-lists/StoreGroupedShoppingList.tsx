"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Store } from "lucide-react";
import { ShoppingListContent, ShoppingItem } from "./shopping-list-content";

interface StoreGroupedShoppingListProps {
  // Structure: { [storeName]: { [category]: items[] } }
  itemsByStore: Record<string, Record<string, ShoppingItem[]>>;
  onToggleItem: (itemId: number, isChecked: boolean) => void;
  onAddItem?: (itemName: string, category: string, store?: string | null) => Promise<{ success: boolean; error?: string }>;
  onRemoveItem?: (itemId: number) => Promise<{ success: boolean; error?: string }>;
  onMoveItem?: (itemName: string, fromCategory: string, toCategory: string) => Promise<{ success: boolean; error?: string }>;
  onEditItem?: (itemId: number, newName: string, store?: string | null) => Promise<{ success: boolean; error?: string }>;
  onMoveItemToStore?: (itemId: number, newStore: string | null) => Promise<{ success: boolean; error?: string }>;
  showAddForm?: boolean;
  accentColor?: "emerald" | "blue";
  isLoading?: boolean;
  newlyAddedIds?: Set<number>;
  availableStores?: string[];
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

  // État pour le drag & drop entre enseignes
  const [draggedItem, setDraggedItem] = useState<{ itemId: number; itemName: string; fromStore: string } | null>(null);
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

  // Handler pour démarrer le drag d'un item (appelé depuis ShoppingListContent)
  const handleItemDragStart = (itemId: number, itemName: string, fromStore: string) => {
    setDraggedItem({ itemId, itemName, fromStore });
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
  const handleStoreDrop = async (e: React.DragEvent, toStore: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || !onMoveItemToStore) {
      setDraggedItem(null);
      setDragOverStore(null);
      return;
    }

    // Ne rien faire si c'est la même enseigne
    if (draggedItem.fromStore === toStore) {
      setDraggedItem(null);
      setDragOverStore(null);
      return;
    }

    // Déplacer l'item vers la nouvelle enseigne
    const newStoreValue = toStore === "Sans enseigne" ? null : toStore;
    await onMoveItemToStore(draggedItem.itemId, newStoreValue);

    setDraggedItem(null);
    setDragOverStore(null);
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
            <button
              onClick={() => toggleStore(storeName)}
              className="w-full px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-stone-500 dark:text-stone-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-stone-500 dark:text-stone-400 flex-shrink-0" />
              )}

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Store className="h-5 w-5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                <h3 className="font-semibold text-base sm:text-lg truncate text-stone-900 dark:text-stone-100">
                  {storeName}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-stone-500 dark:text-stone-400">
                  {itemCount} article{itemCount > 1 ? 's' : ''}
                </span>
              </div>
            </button>

            {/* Contenu de l'enseigne (catégories) */}
            {isExpanded && (
              <div className="px-2 sm:px-3 pb-3 sm:pb-4 pt-1">
                <ShoppingListContent
                  items={storeCategories}
                  onToggleItem={onToggleItem}
                  onRemoveItem={onRemoveItem}
                  onMoveItem={onMoveItem}
                  onEditItem={onEditItem}
                  showAddForm={false} // Pas de formulaire dans chaque enseigne
                  gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4"
                  accentColor={accentColor}
                  isLoading={false}
                  newlyAddedIds={newlyAddedIds}
                  availableStores={availableStores}
                  storeName={storeName}
                  onItemDragStart={(itemId: number, itemName: string) => handleItemDragStart(itemId, itemName, storeName)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
