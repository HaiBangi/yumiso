"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { RecipeCard } from "./recipe-card";
import { RecipeListView } from "./recipe-list-view";
import { ViewToggle } from "./view-toggle";
import { RecipeCheckbox } from "./deletion-mode";
import type { Recipe } from "@/types/recipe";

interface RecipeListProps {
  recipes: Recipe[];
  favoriteIds?: Set<number>;
  isDeletionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelection?: (id: number) => void;
}

interface ViewContextType {
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
}

const ViewContext = createContext<ViewContextType | null>(null);

export function useViewContext() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error("useViewContext must be used within ViewProvider");
  }
  return context;
}

export function ViewProvider({ children }: { children: React.ReactNode }) {
  // Always start with "grid" for SSR consistency
  const [view, setView] = useState<"grid" | "list">("grid");
  const [mounted, setMounted] = useState(false);

  // Load view preference from localStorage only after mount (client-side only)
  useEffect(() => {
    setMounted(true);

    // Only read localStorage after confirming we're client-side
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem("recipe-view");
      if (savedView === "list" || savedView === "grid") {
        setView(savedView);
      }
    }
  }, []);

  // Save view preference to localStorage
  const handleViewChange = (newView: "grid" | "list") => {
    setView(newView);
    if (typeof window !== 'undefined') {
      localStorage.setItem("recipe-view", newView);
    }
  };

  // Use "grid" until mounted to ensure SSR/client consistency
  return (
    <ViewContext.Provider value={{ view: mounted ? view : "grid", setView: handleViewChange }}>
      {children}
    </ViewContext.Provider>
  );
}

export function RecipeViewToggle() {
  const { view, setView } = useViewContext();
  return <ViewToggle view={view} onViewChange={setView} />;
}

export function RecipeList({
  recipes,
  favoriteIds = new Set(),
  isDeletionMode = false,
  selectedIds = new Set(),
  onToggleSelection
}: RecipeListProps) {
  const { view } = useViewContext();
  const [mounted, setMounted] = useState(false);

  // Wait for client-side mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render grid view during SSR and initial client render
  const activeView = mounted ? view : "grid";

  return (
    <div>
      {/* Recipes Display */}
      {activeView === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {recipes.map((recipe) => (
            <div 
              key={recipe.id} 
              className={`relative ${isDeletionMode ? 'cursor-pointer' : ''} ${
                isDeletionMode && selectedIds.has(recipe.id) 
                  ? 'ring-2 ring-red-500 rounded-lg' 
                  : ''
              }`}
              onClick={() => {
                if (isDeletionMode && onToggleSelection) {
                  onToggleSelection(recipe.id);
                }
              }}
            >
              {isDeletionMode && onToggleSelection && (
                <RecipeCheckbox
                  recipeId={recipe.id}
                  isSelected={selectedIds.has(recipe.id)}
                  onToggle={(id) => {
                    // Prevent double toggle
                  }}
                />
              )}
              {isDeletionMode ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <RecipeCard
                    recipe={recipe}
                    isFavorited={favoriteIds.has(recipe.id)}
                  />
                </div>
              ) : (
                <RecipeCard
                  recipe={recipe}
                  isFavorited={favoriteIds.has(recipe.id)}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <RecipeListView
          recipes={recipes}
          favoriteIds={favoriteIds}
          isDeletionMode={isDeletionMode}
          selectedIds={selectedIds}
          onToggleSelection={onToggleSelection}
        />
      )}
    </div>
  );
}
