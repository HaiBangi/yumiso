"use client";

import { useState } from "react";
import { RecipeList } from "./recipe-list";
import { DeletionModeToggle, DeletionActions } from "./deletion-mode";
import type { Recipe } from "@/types/recipe";

interface RecipeListWithDeletionProps {
  recipes: Recipe[];
  favoriteIds: Set<number>;
  isAdmin: boolean;
}

export function RecipeListWithDeletion({ 
  recipes, 
  favoriteIds,
  isAdmin 
}: RecipeListWithDeletionProps) {
  const [isDeletionMode, setIsDeletionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleToggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleToggleDeletionMode = () => {
    setIsDeletionMode(!isDeletionMode);
    if (isDeletionMode) {
      // Clear selection when exiting deletion mode
      setSelectedIds(new Set());
    }
  };

  return (
    <>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <DeletionModeToggle
            isActive={isDeletionMode}
            onToggle={handleToggleDeletionMode}
          />
        </div>
      )}

      <RecipeList
        recipes={recipes}
        favoriteIds={favoriteIds}
        isDeletionMode={isDeletionMode}
        selectedIds={selectedIds}
        onToggleSelection={handleToggleSelection}
      />

      {isDeletionMode && (
        <DeletionActions
          selectedIds={selectedIds}
          onClear={handleClearSelection}
        />
      )}
    </>
  );
}

