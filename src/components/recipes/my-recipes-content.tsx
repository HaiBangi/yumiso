"use client";

import { useState, useMemo } from "react";
import { RecipeList, ViewProvider } from "@/components/recipes/recipe-list";
import { AutoOpenRecipeForm } from "@/components/recipes/auto-open-recipe-form";
import { Button } from "@/components/ui/button";
import { ChefHat, Plus, Globe, FileText, EyeOff, Filter } from "lucide-react";
import { RecipeStatus } from "@/lib/recipe-status";
import type { Recipe } from "@/types/recipe";

type StatusFilter = "ALL" | "PUBLIC" | "DRAFT" | "PRIVATE";

interface MyRecipesContentProps {
  recipes: Recipe[];
}

const statusFilters: { value: StatusFilter; label: string; icon: React.ReactNode; color: string }[] = [
  { 
    value: "ALL", 
    label: "Toutes", 
    icon: <Filter className="h-3.5 w-3.5" />,
    color: "bg-stone-600 dark:bg-stone-500"
  },
  { 
    value: "PUBLIC", 
    label: "Publiques", 
    icon: <Globe className="h-3.5 w-3.5" />,
    color: "bg-emerald-600 dark:bg-emerald-500"
  },
  { 
    value: "DRAFT", 
    label: "Brouillons", 
    icon: <FileText className="h-3.5 w-3.5" />,
    color: "bg-amber-500 dark:bg-amber-500"
  },
  { 
    value: "PRIVATE", 
    label: "Privées", 
    icon: <EyeOff className="h-3.5 w-3.5" />,
    color: "bg-indigo-600 dark:bg-indigo-500"
  },
];

export function MyRecipesContent({ recipes }: MyRecipesContentProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Filtrer les recettes par statut
  const filteredRecipes = useMemo(() => {
    if (statusFilter === "ALL") return recipes;
    return recipes.filter(recipe => recipe.status === statusFilter);
  }, [recipes, statusFilter]);

  // Compter les recettes par statut
  const counts = useMemo(() => ({
    ALL: recipes.length,
    PUBLIC: recipes.filter(r => r.status === RecipeStatus.PUBLIC || !r.status).length,
    DRAFT: recipes.filter(r => r.status === RecipeStatus.DRAFT).length,
    PRIVATE: recipes.filter(r => r.status === RecipeStatus.PRIVATE).length,
  }), [recipes]);

  return (
    <ViewProvider>
      {/* Composant invisible pour gérer l'ouverture automatique depuis le meal planner */}
      <AutoOpenRecipeForm trigger={<span className="hidden" />} />
      
      {/* Header avec titre et filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-700 to-green-600 shadow-md">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">Mes recettes</h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              {filteredRecipes.length} recette{filteredRecipes.length !== 1 ? "s" : ""} 
              {statusFilter !== "ALL" && ` ${statusFilters.find(f => f.value === statusFilter)?.label.toLowerCase()}`}
            </p>
          </div>
        </div>

        {/* Status Filter Buttons */}
        {recipes.length > 0 && (
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm">
            {statusFilters.map((filter) => {
              const isActive = statusFilter === filter.value;
              const count = counts[filter.value];
              
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer
                    ${isActive 
                      ? `${filter.color} text-white shadow-sm` 
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700"
                    }
                  `}
                >
                  {filter.icon}
                  <span className="hidden sm:inline">{filter.label}</span>
                  <span className={`
                    text-xs px-1.5 py-0.5 rounded-full
                    ${isActive 
                      ? "bg-white/20 text-white" 
                      : "bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-300"
                    }
                  `}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700">
          <ChefHat className="h-16 w-16 mx-auto text-stone-300 dark:text-stone-600 mb-4" />
          <h2 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">
            Aucune recette pour le moment
          </h2>
          <p className="text-stone-500 dark:text-stone-400 mb-6">
            Commencez à créer vos propres recettes !
          </p>
          <AutoOpenRecipeForm
            trigger={
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Créer ma première recette
              </Button>
            }
          />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            statusFilter === "DRAFT" 
              ? "bg-amber-100 dark:bg-amber-900/30" 
              : statusFilter === "PRIVATE"
              ? "bg-indigo-100 dark:bg-indigo-900/30"
              : "bg-emerald-100 dark:bg-emerald-900/30"
          }`}>
            {statusFilter === "DRAFT" && <FileText className="h-8 w-8 text-amber-500" />}
            {statusFilter === "PRIVATE" && <EyeOff className="h-8 w-8 text-indigo-500" />}
            {statusFilter === "PUBLIC" && <Globe className="h-8 w-8 text-emerald-500" />}
          </div>
          <h2 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">
            Aucune recette {statusFilters.find(f => f.value === statusFilter)?.label.toLowerCase()}
          </h2>
          <p className="text-stone-500 dark:text-stone-400 mb-6">
            {statusFilter === "DRAFT" && "Vous n'avez pas de brouillons en cours."}
            {statusFilter === "PRIVATE" && "Vous n'avez pas de recettes privées."}
            {statusFilter === "PUBLIC" && "Vous n'avez pas encore publié de recettes."}
          </p>
          <Button 
            variant="outline" 
            onClick={() => setStatusFilter("ALL")}
            className="cursor-pointer"
          >
            Voir toutes les recettes
          </Button>
        </div>
      ) : (
        <RecipeList recipes={filteredRecipes} />
      )}
    </ViewProvider>
  );
}
