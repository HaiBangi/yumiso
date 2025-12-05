"use client";

import { createContext, useContext, ReactNode } from "react";
import type { Recipe } from "@/types/recipe";

interface RecipeContextType {
  recipe: Recipe | null;
}

const RecipeContext = createContext<RecipeContextType | null>(null);

export function useRecipeContext() {
  const context = useContext(RecipeContext);
  return context;
}

export function RecipeProvider({ 
  children, 
  recipe 
}: { 
  children: ReactNode; 
  recipe: Recipe | null;
}) {
  return (
    <RecipeContext.Provider value={{ recipe }}>
      {children}
    </RecipeContext.Provider>
  );
}

