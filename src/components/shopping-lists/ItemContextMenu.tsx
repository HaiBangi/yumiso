"use client";

import { useEffect, useRef } from "react";
import { Store as StoreIcon, ArrowRight } from "lucide-react";
import type { Store } from "@/types/store";

interface ItemContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onMoveToStore: (storeId: number | null, storeName: string) => void;
  availableStores: Store[];
  storesInList: Set<string>; // Enseignes déjà présentes dans la liste
  currentStoreName?: string; // Enseigne actuelle de l'item
}

export function ItemContextMenu({
  position,
  onClose,
  onMoveToStore,
  availableStores,
  storesInList,
  currentStoreName,
}: ItemContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Trier les enseignes :
  // 1. Enseignes déjà dans la liste (sauf l'enseigne actuelle)
  // 2. Top 10 autres enseignes par displayOrder

  console.log('[ItemContextMenu] 🔍 Debug:', {
    availableStoresCount: availableStores.length,
    availableStores: availableStores.map(s => ({ name: s.name, isActive: s.isActive })),
    storesInList: Array.from(storesInList),
    currentStoreName
  });

  const sortedStores = [...availableStores]
    .filter(store => store.isActive && store.name !== currentStoreName)
    .sort((a, b) => {
      const aInList = storesInList.has(a.name);
      const bInList = storesInList.has(b.name);

      // Priorité 1 : Enseignes déjà dans la liste
      if (aInList && !bInList) return -1;
      if (!aInList && bInList) return 1;

      // Priorité 2 : Par displayOrder
      return a.displayOrder - b.displayOrder;
    })
    .slice(0, 10); // Limiter au top 10

  console.log('[ItemContextMenu] 📊 Résultat tri:', {
    sortedStoresCount: sortedStores.length,
    sortedStores: sortedStores.map(s => s.name)
  });

  // Ajouter l'option "Sans enseigne" si ce n'est pas déjà le cas
  const showNoStoreOption = currentStoreName !== "Sans enseigne";

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl py-1 min-w-[240px] max-w-[280px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 'var(--z-popover)',
      }}
    >
      <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-700">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
          <ArrowRight className="h-3.5 w-3.5" />
          Déplacer vers l&apos;enseigne
        </p>
      </div>

      <div className="max-h-[400px] overflow-y-auto py-1">
        {showNoStoreOption && (
          <>
            <button
              onClick={() => {
                onMoveToStore(null, "Sans enseigne");
                onClose();
              }}
              className="w-full px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors flex items-center gap-2.5 group"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded bg-stone-200 dark:bg-stone-600">
                <StoreIcon className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
              </div>
              <span className="text-sm text-stone-700 dark:text-stone-300 font-medium">
                Sans enseigne
              </span>
            </button>
            <div className="h-px bg-stone-200 dark:bg-stone-700 my-1" />
          </>
        )}

        {sortedStores.map((store) => {
          const isInList = storesInList.has(store.name);

          return (
            <button
              key={store.id}
              onClick={() => {
                onMoveToStore(store.id, store.name);
                onClose();
              }}
              className="w-full px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors flex items-center gap-2.5 group"
            >
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="w-6 h-6 object-contain rounded"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: store.color }}
                >
                  <StoreIcon className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <span className="text-sm text-stone-700 dark:text-stone-300 font-medium flex-1">
                {store.name}
              </span>
              {isInList && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  Dans la liste
                </span>
              )}
            </button>
          );
        })}
      </div>

      {sortedStores.length === 0 && !showNoStoreOption && (
        <div className="px-3 py-4 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Aucune autre enseigne disponible
          </p>
        </div>
      )}
    </div>
  );
}
