"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { RecipeCard } from "./recipe-card";
import { RecipeListView } from "./recipe-list-view";
import { ViewToggle } from "./view-toggle";
import type { Recipe } from "@/types/recipe";

interface RecipeListProps {
  recipes: Recipe[];
  favoriteIds?: Set<number>;
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
  const [view, setView] = useState<"grid" | "list">("grid");

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("recipe-view");
    if (savedView === "list" || savedView === "grid") {
      setView(savedView);
    }
  }, []);

  // Save view preference to localStorage
  const handleViewChange = (newView: "grid" | "list") => {
    setView(newView);
    localStorage.setItem("recipe-view", newView);
  };

  return (
    <ViewContext.Provider value={{ view, setView: handleViewChange }}>
      {children}
    </ViewContext.Provider>
  );
}

export function RecipeViewToggle() {
  const { view, setView } = useViewContext();
  return <ViewToggle view={view} onViewChange={setView} />;
}

export function RecipeList({ recipes, favoriteIds = new Set() }: RecipeListProps) {
  const { view } = useViewContext();

  return (
    <div>
      {/* Recipes Display */}
      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorited={favoriteIds.has(recipe.id)}
            />
          ))}
        </div>
      ) : (
        <RecipeListView recipes={recipes} favoriteIds={favoriteIds} />
      )}
    </div>
  );
}
