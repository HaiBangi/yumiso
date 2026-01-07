"use client";

import React, { useState, useRef, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Store as StoreIcon, X } from "lucide-react";
import { categorizeIngredient } from "./shopping-list-content";
import type { Store } from "@/types/store";

interface AddItemFormProps {
  onAddItem: (itemName: string, category: string, storeId?: number | null, storeName?: string | null) => Promise<{ success: boolean; error?: string }>;
  availableStores?: Store[]; // Liste des enseignes disponibles
}

export const AddItemForm = memo(function AddItemForm({ onAddItem, availableStores = [] }: AddItemFormProps) {
  const [newItemName, setNewItemName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [showStoreInput, setShowStoreInput] = useState(false);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const storeInputRef = useRef<HTMLInputElement>(null);

  // Filtrer les suggestions en fonction de la saisie
  const filteredStores = storeName
    ? availableStores.filter(store =>
        store.name.toLowerCase().includes(storeName.toLowerCase())
      )
    : availableStores;

  const handleAddItem = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || isAddingItem) return;

    const inputElement = inputRef.current;
    setIsAddingItem(true);
    setAddItemError(null);

    const category = categorizeIngredient(newItemName.trim());

    // Trouver le storeId à partir du nom d'enseigne
    const selectedStore = storeName.trim()
      ? availableStores.find(s => s.name.toLowerCase() === storeName.trim().toLowerCase())
      : null;
    const storeId = selectedStore ? selectedStore.id : null;

    console.log('[AddItemForm] storeId:', storeId, 'type:', typeof storeId, 'from storeName:', storeName);

    // Passer à la fois storeId ET storeName pour permettre la création d'enseignes
    const result = await onAddItem(newItemName.trim(), category, storeId, storeName.trim() || null);

    setIsAddingItem(false);

    if (result.success) {
      setNewItemName("");
      // Ne pas vider storeName pour garder la dernière enseigne utilisée
      setShowStoreSuggestions(false);
      setSelectedSuggestionIndex(-1);
      requestAnimationFrame(() => {
        inputElement?.focus();
      });
    } else {
      setAddItemError(result.error || "Erreur lors de l'ajout");
      requestAnimationFrame(() => {
        inputElement?.focus();
      });
    }
  }, [newItemName, storeName, isAddingItem, onAddItem, availableStores]);

  const selectStore = (store: string) => {
    setStoreName(store);
    setShowStoreSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const clearStore = () => {
    setStoreName("");
    setShowStoreSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Gestion de la navigation au clavier dans l'autocomplete
  const handleStoreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showStoreSuggestions || filteredStores.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < filteredStores.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : -1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selectedStore = filteredStores[selectedSuggestionIndex];
          selectStore(selectedStore.name);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowStoreSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  return (
    <div className="mb-3 sm:mb-4 space-y-2 sm:space-y-3">
      <form onSubmit={handleAddItem} className="space-y-2">
        {/* Desktop: deux inputs côte à côte */}
        <div className="hidden sm:flex gap-2 items-start">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Ajouter un article..."
            value={newItemName}
            onChange={(e) => !isAddingItem && setNewItemName(e.target.value)}
            className={`flex-1 text-sm bg-white dark:bg-stone-800 ${
              isAddingItem ? "opacity-60 cursor-not-allowed" : ""
            }`}
            readOnly={isAddingItem}
          />

          {/* Input enseigne avec autocomplete custom - 2x plus large (w-96 au lieu de w-52) */}
          <div className="relative w-96">
            <div className="relative">
              <StoreIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                ref={storeInputRef}
                type="text"
                placeholder="Enseigne (optionnel)"
                value={storeName}
                onChange={(e) => {
                  if (!isAddingItem) {
                    setStoreName(e.target.value);
                    setShowStoreSuggestions(true);
                    setSelectedSuggestionIndex(-1);
                  }
                }}
                onKeyDown={handleStoreKeyDown}
                onFocus={() => {
                  setShowStoreSuggestions(true);
                  setSelectedSuggestionIndex(-1);
                }}
                onBlur={() => {
                  // Délai pour permettre le clic sur une suggestion
                  setTimeout(() => {
                    setShowStoreSuggestions(false);
                    setSelectedSuggestionIndex(-1);
                  }, 200);
                }}
                className={`pl-9 pr-8 text-sm bg-white dark:bg-stone-800 ${
                  isAddingItem ? "opacity-60 cursor-not-allowed" : ""
                }`}
                readOnly={isAddingItem}
              />
              {storeName && !isAddingItem && (
                <button
                  type="button"
                  onClick={clearStore}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-stone-400" />
                </button>
              )}
            </div>

            {/* Suggestions dropdown avec navigation clavier */}
            {showStoreSuggestions && filteredStores.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredStores.map((store, index) => (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => selectStore(store.name)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 group ${
                      index === selectedSuggestionIndex
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.name} className="h-4 w-4 object-contain" />
                    ) : (
                      <StoreIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    )}
                    <span className="text-stone-900 dark:text-stone-100">{store.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={!newItemName.trim() || isAddingItem}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 h-9 text-sm"
          >
            {isAddingItem ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Ajouter
          </Button>
        </div>

        {/* Mobile: input principal + dropdown optionnel en dessous */}
        <div className="sm:hidden space-y-2">
          <div className="flex gap-1.5 items-center">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Ajouter un article..."
              value={newItemName}
              onChange={(e) => !isAddingItem && setNewItemName(e.target.value)}
              className={`flex-1 text-[15px] bg-white dark:bg-stone-800 placeholder:text-[15px] ${
                isAddingItem ? "opacity-60 cursor-not-allowed" : ""
              }`}
              readOnly={isAddingItem}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowStoreInput(!showStoreInput)}
              className={`h-8 px-2 ${showStoreInput ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : ''}`}
              disabled={isAddingItem}
            >
              <StoreIcon className={`h-3.5 w-3.5 ${showStoreInput ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            </Button>
            <Button
              type="submit"
              disabled={!newItemName.trim() || isAddingItem}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 h-8 text-sm"
            >
              {isAddingItem ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {showStoreInput && (
            <div className="relative">
              <div className="relative">
                {/* Logo de l'enseigne sélectionnée ou icône par défaut */}
                {(() => {
                  const selectedStore = availableStores.find(s => s.name === storeName);
                  return selectedStore?.logoUrl ? (
                    <img
                      src={selectedStore.logoUrl}
                      alt={selectedStore.name}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 object-contain"
                    />
                  ) : (
                    <StoreIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  );
                })()}
                <Input
                  ref={storeInputRef}
                  type="text"
                  placeholder="Enseigne (optionnel)"
                  value={storeName}
                  onChange={(e) => {
                    if (!isAddingItem) {
                      setStoreName(e.target.value);
                      setShowStoreSuggestions(true);
                      setSelectedSuggestionIndex(-1);
                    }
                  }}
                  onKeyDown={handleStoreKeyDown}
                  onFocus={() => {
                    setShowStoreSuggestions(true);
                    setSelectedSuggestionIndex(-1);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowStoreSuggestions(false);
                      setSelectedSuggestionIndex(-1);
                    }, 200);
                  }}
                  className={`pl-9 pr-8 text-[15px] bg-white dark:bg-stone-800 ${
                    isAddingItem ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  readOnly={isAddingItem}
                />
                {storeName && !isAddingItem && (
                  <button
                    type="button"
                    onClick={clearStore}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors"
                  >
                    <X className="h-3 w-3 text-stone-400" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown mobile avec navigation clavier */}
              {showStoreSuggestions && filteredStores.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredStores.map((store, index) => (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => selectStore(store.name)}
                      className={`w-full px-3 py-2.5 text-left text-[15px] transition-colors flex items-center gap-2 ${
                        index === selectedSuggestionIndex
                          ? 'bg-blue-100 dark:bg-blue-900/40'
                          : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      {store.logoUrl ? (
                        <img src={store.logoUrl} alt={store.name} className="h-4 w-4 object-contain" />
                      ) : (
                        <StoreIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      )}
                      <span className="text-stone-900 dark:text-stone-100">
                        {store.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </form>
      {addItemError && (
        <p className="text-xs text-red-500 mt-1">{addItemError}</p>
      )}
    </div>
  );
});
