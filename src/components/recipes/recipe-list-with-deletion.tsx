"use client";

import { useState, createContext, useContext, ReactNode } from "react";
import { RecipeList } from "./recipe-list";
import { DeletionModeToggle, DeletionActions } from "./deletion-mode";
import type { Recipe } from "@/types/recipe";

interface RecipeListWithDeletionProps {
  recipes: Recipe[];
  favoriteIds: Set<number>;
  isAdmin: boolean;
}

interface DeletionModeContextType {
  isDeletionMode: boolean;
  selectedIds: Set<number>;
  handleToggleSelection: (id: number) => void;
  handleToggleDeletionMode: () => void;
  handleClearSelection: () => void;
}

const DeletionModeContext = createContext<DeletionModeContextType | null>(null);

export function useDeletionMode() {
  const context = useContext(DeletionModeContext);
  if (!context) {
    throw new Error("useDeletionMode must be used within DeletionModeProvider");
  }
  return context;
}

export function DeletionModeProvider({
  children,
  isAdmin
}: {
  children: ReactNode;
  isAdmin: boolean;
}) {
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
      setSelectedIds(new Set());
    }
  };

  return (
    <DeletionModeContext.Provider
      value={{
        isDeletionMode,
        selectedIds,
        handleToggleSelection,
        handleToggleDeletionMode,
        handleClearSelection,
      }}
    >
      {children}
    </DeletionModeContext.Provider>
  );
}

export function DeletionModeToggleButton({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) return null;

  const { isDeletionMode, handleToggleDeletionMode } = useDeletionMode();

  return (
    <DeletionModeToggle
      isActive={isDeletionMode}
      onToggle={handleToggleDeletionMode}
    />
  );
}

export function RecipeListWithDeletion({
  recipes,
  favoriteIds,
  isAdmin
}: RecipeListWithDeletionProps) {
  const { isDeletionMode, selectedIds, handleToggleSelection, handleClearSelection } = useDeletionMode();

  return (
    <>
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

