"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Plus, X, Loader2 } from "lucide-react";
import { searchRecipesByName, getRecipeIngredients } from "@/actions/recipes";
import { toast } from "sonner";
import { categorizeIngredient } from "./shopping-list-content";

interface Recipe {
  id: number;
  name: string;
  slug: string;
}

interface AddRecipeIngredientsProps {
  onAddIngredients: (ingredients: Array<{ name: string; category: string }>) => Promise<void>;
  accentColor?: "emerald" | "blue";
  inDialog?: boolean; // Si true, n'affiche pas le bouton d'ouverture
}

export function AddRecipeIngredients({ onAddIngredients, accentColor = "emerald", inDialog = false }: AddRecipeIngredientsProps) {
  const [isOpen, setIsOpen] = useState(inDialog); // Si dans un dialog, toujours ouvert
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accentClasses = accentColor === "emerald"
    ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";

  const accentBadgeClasses = accentColor === "emerald"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";

  // Recherche avec debounce
  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const result = await searchRecipesByName(query);
    setIsSearching(false);

    if (result.success) {
      setSearchResults(result.data);
      setShowDropdown(result.data.length > 0);
    } else {
      toast.error(result.error);
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, []);

  // Gérer le changement de l'input avec debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  // Sélectionner une recette
  const handleSelectRecipe = useCallback((recipe: Recipe) => {
    if (!selectedRecipes.find(r => r.id === recipe.id)) {
      setSelectedRecipes(prev => [...prev, recipe]);
    }
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    // Remettre le focus sur l'input
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [selectedRecipes]);

  // Retirer une recette sélectionnée
  const handleRemoveRecipe = useCallback((recipeId: number) => {
    setSelectedRecipes(prev => prev.filter(r => r.id !== recipeId));
  }, []);

  // Ajouter les ingrédients des recettes sélectionnées
  const handleAddIngredients = async () => {
    if (selectedRecipes.length === 0) return;

    setIsAdding(true);

    try {
      const allIngredients: Array<{ name: string; category: string }> = [];

      // Récupérer les ingrédients de chaque recette
      for (const recipe of selectedRecipes) {
        const result = await getRecipeIngredients(recipe.id);

        if (result.success) {
          result.data.forEach(ingredient => {
            const category = categorizeIngredient(ingredient.name);
            const displayName = ingredient.quantity && ingredient.unit
              ? `${ingredient.name} (${ingredient.quantity} ${ingredient.unit})`
              : ingredient.quantity
              ? `${ingredient.name} (${ingredient.quantity})`
              : ingredient.name;

            allIngredients.push({
              name: displayName,
              category,
            });
          });
        }
      }

      if (allIngredients.length > 0) {
        await onAddIngredients(allIngredients);
        toast.success(`${allIngredients.length} ingrédient${allIngredients.length > 1 ? 's' : ''} ajouté${allIngredients.length > 1 ? 's' : ''} !`);
        setSelectedRecipes([]);
        if (!inDialog) {
          setIsOpen(false);
        }
      } else {
        toast.error("Aucun ingrédient trouvé dans les recettes sélectionnées");
      }
    } catch (error) {
      console.error("Error adding ingredients:", error);
      toast.error("Erreur lors de l'ajout des ingrédients");
    } finally {
      setIsAdding(false);
    }
  };

  // Fermer le dropdown quand on clique dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ne pas afficher le bouton toggle si on est déjà dans un dialog
  if (!isOpen && !inDialog) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="w-full"
      >
        <ChefHat className="h-4 w-4 mr-2" />
        Ajouter les ingrédients d&apos;une recette
      </Button>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-stone-50 dark:bg-stone-900/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-stone-600 dark:text-stone-400" />
          <h3 className="font-semibold text-stone-900 dark:text-stone-100">
            Ajouter des recettes
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery("");
            setSearchResults([]);
            setSelectedRecipes([]);
            setShowDropdown(false);
          }}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher une recette..."
            className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-stone-400" />
          )}
        </div>

        {/* Dropdown de résultats */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-stone-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => handleSelectRecipe(recipe)}
                className="w-full px-4 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors flex items-center justify-between group"
                disabled={selectedRecipes.some(r => r.id === recipe.id)}
              >
                <span className="text-stone-900 dark:text-stone-100">{recipe.name}</span>
                {selectedRecipes.some(r => r.id === recipe.id) ? (
                  <span className="text-xs text-stone-500">Déjà ajoutée</span>
                ) : (
                  <Plus className="h-4 w-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recettes sélectionnées */}
      {selectedRecipes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Recettes sélectionnées ({selectedRecipes.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedRecipes.map((recipe) => (
              <Badge
                key={recipe.id}
                variant="secondary"
                className={`${accentBadgeClasses} pl-3 pr-1 py-1 flex items-center gap-1`}
              >
                {recipe.name}
                <button
                  onClick={() => handleRemoveRecipe(recipe.id)}
                  className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleAddIngredients}
          disabled={selectedRecipes.length === 0 || isAdding}
          className={`flex-1 ${accentClasses} text-white`}
        >
          {isAdding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ajout en cours...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter les ingrédients ({selectedRecipes.length})
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery("");
            setSearchResults([]);
            setSelectedRecipes([]);
            setShowDropdown(false);
          }}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
