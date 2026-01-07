"use client";

import React, { useState, useRef, useCallback, memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Store } from "lucide-react";
import { categorizeIngredient } from "./shopping-list-content";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AddItemFormWithStoreProps {
  onAddItem: (itemName: string, category: string, store?: string | null) => Promise<{ success: boolean; error?: string }>;
  availableStores?: string[]; // Liste des enseignes disponibles pour l'autocomplete
}

export const AddItemFormWithStore = memo(function AddItemFormWithStore({
  onAddItem,
  availableStores = []
}: AddItemFormWithStoreProps) {
  const [newItemName, setNewItemName] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const [openStoreCombobox, setOpenStoreCombobox] = useState(false);
  const [storeSearchValue, setStoreSearchValue] = useState("");

  const itemInputRef = useRef<HTMLInputElement>(null);
  const storeInputRef = useRef<HTMLInputElement>(null);

  // Fusionner les enseignes disponibles avec quelques suggestions par défaut
  const suggestedStores = useMemo(() => {
    const defaults = [
      "Auchan",
      "Carrefour",
      "Leclerc",
      "Intermarché",
      "Lidl",
      "Casino",
      "Monoprix",
      "Boulangerie",
      "Marché",
      "Pharmacie",
      "Supermarché local"
    ];

    // Combiner et dédupliquer
    const combined = [...new Set([...availableStores, ...defaults])];
    return combined.sort((a, b) => a.localeCompare(b, 'fr'));
  }, [availableStores]);

  // Filtrer les enseignes en fonction de la recherche
  const filteredStores = useMemo(() => {
    if (!storeSearchValue) return suggestedStores;

    const search = storeSearchValue.toLowerCase();
    return suggestedStores.filter(store =>
      store.toLowerCase().includes(search)
    );
  }, [suggestedStores, storeSearchValue]);

  const handleAddItem = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || isAddingItem) return;

    const inputElement = itemInputRef.current;
    setIsAddingItem(true);
    setAddItemError(null);

    const category = categorizeIngredient(newItemName.trim());
    const storeValue = selectedStore.trim() || null;

    const result = await onAddItem(newItemName.trim(), category, storeValue);

    setIsAddingItem(false);

    if (result.success) {
      setNewItemName("");
      // NE PAS réinitialiser le store pour permettre l'ajout rapide de plusieurs items dans la même enseigne
      // setSelectedStore("");
      requestAnimationFrame(() => {
        inputElement?.focus();
      });
    } else {
      setAddItemError(result.error || "Erreur lors de l'ajout");
      requestAnimationFrame(() => {
        inputElement?.focus();
      });
    }
  }, [newItemName, selectedStore, isAddingItem, onAddItem]);

  return (
    <div className="mb-3 sm:mb-4 space-y-3">
      <form onSubmit={handleAddItem} className="space-y-2">
        {/* Desktop : 2 inputs côte à côte */}
        <div className="hidden sm:flex gap-2 items-center">
          <Input
            ref={itemInputRef}
            type="text"
            placeholder="Ajouter un article..."
            value={newItemName}
            onChange={(e) => !isAddingItem && setNewItemName(e.target.value)}
            className={`flex-1 text-sm bg-white dark:bg-stone-800 ${
              isAddingItem ? "opacity-60 cursor-not-allowed" : ""
            }`}
            readOnly={isAddingItem}
          />

          <Popover open={openStoreCombobox} onOpenChange={setOpenStoreCombobox}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={openStoreCombobox}
                className="w-[200px] justify-between"
                disabled={isAddingItem}
              >
                <Store className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">
                  {selectedStore || "Enseigne (optionnel)"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Rechercher..."
                  value={storeSearchValue}
                  onValueChange={setStoreSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="p-2 text-sm text-center space-y-2">
                      <p className="text-muted-foreground">Aucune enseigne trouvée</p>
                      {storeSearchValue && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedStore(storeSearchValue);
                            setOpenStoreCombobox(false);
                            setStoreSearchValue("");
                          }}
                        >
                          Créer "{storeSearchValue}"
                        </Button>
                      )}
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {selectedStore && (
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setSelectedStore("");
                          setOpenStoreCombobox(false);
                          setStoreSearchValue("");
                        }}
                      >
                        <span className="text-muted-foreground italic">Sans enseigne</span>
                      </CommandItem>
                    )}
                    {filteredStores.map((store) => (
                      <CommandItem
                        key={store}
                        value={store}
                        onSelect={(currentValue) => {
                          setSelectedStore(currentValue === selectedStore ? "" : store);
                          setOpenStoreCombobox(false);
                          setStoreSearchValue("");
                        }}
                      >
                        {store}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            type="submit"
            disabled={!newItemName.trim() || isAddingItem}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 h-9"
          >
            {isAddingItem ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>Ajouter</span>
          </Button>
        </div>

        {/* Mobile : Input principal puis dropdown en dessous */}
        <div className="sm:hidden space-y-2">
          <div className="flex gap-1.5 items-center">
            <Input
              ref={itemInputRef}
              type="text"
              placeholder="Ajouter un article..."
              value={newItemName}
              onChange={(e) => !isAddingItem && setNewItemName(e.target.value)}
              className={`flex-1 text-[15px] bg-white dark:bg-stone-800 ${
                isAddingItem ? "opacity-60 cursor-not-allowed" : ""
              }`}
              readOnly={isAddingItem}
            />
            <Button
              type="submit"
              disabled={!newItemName.trim() || isAddingItem}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 h-8"
            >
              {isAddingItem ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span className="hidden xs:inline text-sm">Ajouter</span>
            </Button>
          </div>

          <Popover open={openStoreCombobox} onOpenChange={setOpenStoreCombobox}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={openStoreCombobox}
                className="w-full justify-between h-8 text-sm"
                disabled={isAddingItem}
              >
                <Store className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                <span className="truncate flex-1 text-left">
                  {selectedStore || "Enseigne (optionnel)"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Rechercher..."
                  value={storeSearchValue}
                  onValueChange={setStoreSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="p-2 text-sm text-center space-y-2">
                      <p className="text-muted-foreground">Aucune enseigne trouvée</p>
                      {storeSearchValue && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedStore(storeSearchValue);
                            setOpenStoreCombobox(false);
                            setStoreSearchValue("");
                          }}
                        >
                          Créer "{storeSearchValue}"
                        </Button>
                      )}
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {selectedStore && (
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setSelectedStore("");
                          setOpenStoreCombobox(false);
                          setStoreSearchValue("");
                        }}
                      >
                        <span className="text-muted-foreground italic">Sans enseigne</span>
                      </CommandItem>
                    )}
                    {filteredStores.map((store) => (
                      <CommandItem
                        key={store}
                        value={store}
                        onSelect={(currentValue) => {
                          setSelectedStore(currentValue === selectedStore ? "" : store);
                          setOpenStoreCombobox(false);
                          setStoreSearchValue("");
                        }}
                      >
                        {store}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </form>

      {addItemError && (
        <p className="text-xs text-red-500 mt-1">{addItemError}</p>
      )}
    </div>
  );
});
