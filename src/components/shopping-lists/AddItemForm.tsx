"use client";

import React, { useState, useRef, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";
import { categorizeIngredient } from "./shopping-list-content";

interface AddItemFormProps {
  onAddItem: (itemName: string, category: string) => Promise<{ success: boolean; error?: string }>;
}

export const AddItemForm = memo(function AddItemForm({ onAddItem }: AddItemFormProps) {
  const [newItemName, setNewItemName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddItem = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || isAddingItem) return;

    const inputElement = inputRef.current;
    setIsAddingItem(true);
    setAddItemError(null);

    const category = categorizeIngredient(newItemName.trim());
    const result = await onAddItem(newItemName.trim(), category);

    setIsAddingItem(false);

    if (result.success) {
      setNewItemName("");
      requestAnimationFrame(() => {
        inputElement?.focus();
      });
    } else {
      setAddItemError(result.error || "Erreur lors de l'ajout");
      requestAnimationFrame(() => {
        inputElement?.focus();
      });
    }
  }, [newItemName, isAddingItem, onAddItem]);

  return (
    <div className="mb-3 sm:mb-4 space-y-3">
      <form onSubmit={handleAddItem} className="flex gap-1.5 sm:gap-2 items-center">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Ajouter un article..."
          value={newItemName}
          onChange={(e) => !isAddingItem && setNewItemName(e.target.value)}
          className={`flex-1 text-[15px] sm:text-sm bg-white dark:bg-stone-800 placeholder:text-[15px] sm:placeholder:text-sm ${
            isAddingItem ? "opacity-60 cursor-not-allowed" : ""
          }`}
          readOnly={isAddingItem}
        />
        <Button
          type="submit"
          disabled={!newItemName.trim() || isAddingItem}
          className="gap-1 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3 h-8 sm:h-9 text-sm"
        >
          {isAddingItem ? (
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </form>
      {addItemError && (
        <p className="text-xs text-red-500 mt-1">{addItemError}</p>
      )}
    </div>
  );
});
