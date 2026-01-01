"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChefHat, Plus, X, Loader2, ChevronRight, Check, ChevronDown } from "lucide-react";
import { searchRecipesByName, getRecipeIngredients } from "@/actions/recipes";
import { toast } from "sonner";
import { categorizeIngredient, CATEGORY_ORDER, CATEGORIES } from "./shopping-list-content";

interface Recipe {
  id: number;
  name: string;
  slug: string;
}

interface IngredientPreview {
  id: string;
  name: string;
  displayName: string;
  category: string;
  recipeId: number;
  recipeName: string;
  selected: boolean;
}

interface AddRecipeIngredientsProps {
  onAddIngredients: (ingredients: Array<{ name: string; category: string }>) => Promise<void>;
  accentColor?: "emerald" | "blue";
  inDialog?: boolean;
}

export function AddRecipeIngredients({ onAddIngredients, accentColor = "emerald", inDialog = false }: AddRecipeIngredientsProps) {
  const [isOpen, setIsOpen] = useState(inDialog);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const [ingredientsPreview, setIngredientsPreview] = useState<IngredientPreview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
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

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  // Sélectionner une recette et charger ses ingrédients
  const handleSelectRecipe = useCallback(async (recipe: Recipe) => {
    if (selectedRecipes.find(r => r.id === recipe.id)) return;

    setSelectedRecipes(prev => [...prev, recipe]);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);

    setIsLoadingIngredients(true);
    try {
      const result = await getRecipeIngredients(recipe.id);

      if (result.success) {
        const newIngredients: IngredientPreview[] = result.data.map((ingredient, index) => {
          const category = categorizeIngredient(ingredient.name);
          const displayName = ingredient.quantity && ingredient.unit
            ? `${ingredient.name} (${ingredient.quantity} ${ingredient.unit})`
            : ingredient.quantity
            ? `${ingredient.name} (${ingredient.quantity})`
            : ingredient.name;

          return {
            id: `${recipe.id}-${index}`,
            name: ingredient.name,
            displayName,
            category,
            recipeId: recipe.id,
            recipeName: recipe.name,
            selected: true,
          };
        });

        setIngredientsPreview(prev => [...prev, ...newIngredients]);
      } else {
        toast.error(`Erreur lors du chargement des ingrédients de "${recipe.name}"`);
      }
    } catch (error) {
      console.error("Error loading ingredients:", error);
      toast.error(`Erreur lors du chargement des ingrédients`);
    } finally {
      setIsLoadingIngredients(false);
    }

    setTimeout(() => inputRef.current?.focus(), 0);
  }, [selectedRecipes]);

  const handleRemoveRecipe = useCallback((recipeId: number) => {
    setSelectedRecipes(prev => prev.filter(r => r.id !== recipeId));
    setIngredientsPreview(prev => prev.filter(ing => ing.recipeId !== recipeId));
  }, []);

  const toggleIngredient = useCallback((ingredientId: string) => {
    setIngredientsPreview(prev =>
      prev.map(ing =>
        ing.id === ingredientId ? { ...ing, selected: !ing.selected } : ing
      )
    );
  }, []);

  const toggleCategory = useCallback((category: string) => {
    const categoryIngredients = ingredientsPreview.filter(ing => ing.category === category);
    const allSelected = categoryIngredients.every(ing => ing.selected);

    setIngredientsPreview(prev =>
      prev.map(ing =>
        ing.category === category ? { ...ing, selected: !allSelected } : ing
      )
    );
  }, [ingredientsPreview]);

  const toggleCategoryExpand = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const selectedIngredientsCount = ingredientsPreview.filter(ing => ing.selected).length;
  const totalIngredientsCount = ingredientsPreview.length;

  const handleAddIngredients = async () => {
    const selectedIngredients = ingredientsPreview.filter(ing => ing.selected);

    if (selectedIngredients.length === 0) {
      toast.error("Veuillez sélectionner au moins un ingrédient");
      return;
    }

    setIsAdding(true);

    try {
      const ingredientsToAdd = selectedIngredients.map(ing => ({
        name: ing.displayName,
        category: ing.category,
      }));

      await onAddIngredients(ingredientsToAdd);
      toast.success(`${selectedIngredients.length} ingrédient${selectedIngredients.length > 1 ? 's' : ''} ajouté${selectedIngredients.length > 1 ? 's' : ''} !`);

      setSelectedRecipes([]);
      setIngredientsPreview([]);

      if (!inDialog) {
        setIsOpen(false);
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

  // Grouper les ingrédients par catégorie
  const ingredientsByCategory = CATEGORY_ORDER.reduce((acc, category) => {
    const categoryIngredients = ingredientsPreview.filter(ing => ing.category === category);
    if (categoryIngredients.length > 0) {
      acc[category] = categoryIngredients;
    }
    return acc;
  }, {} as Record<string, IngredientPreview[]>);

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

  const content = (
    <div className="space-y-4">
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
            disabled={isLoadingIngredients}
          />
          {(isSearching || isLoadingIngredients) && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-stone-400" />
          )}
        </div>

        {/* Dropdown de résultats */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-stone-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((recipe) => {
              const isAlreadySelected = selectedRecipes.some(r => r.id === recipe.id);
              return (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  className={`w-full px-4 py-2 text-left transition-colors flex items-center justify-between group ${
                    isAlreadySelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                  disabled={isAlreadySelected}
                >
                  <span className={`${isAlreadySelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-stone-900 dark:text-stone-100'}`}>
                    {recipe.name}
                  </span>
                  {isAlreadySelected ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Déjà ajoutée</span>
                  ) : (
                    <Plus className="h-4 w-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recettes sélectionnées */}
      {selectedRecipes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Recettes ({selectedRecipes.length})
            </p>
            {ingredientsPreview.length > 0 && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {selectedIngredientsCount}/{totalIngredientsCount} ingrédients sélectionnés
              </p>
            )}
          </div>
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
                  disabled={isLoadingIngredients}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Prévisualisation des ingrédients par catégorie */}
      {ingredientsPreview.length > 0 && (
        <div className="space-y-3 max-h-[500px] overflow-y-auto border rounded-lg bg-stone-50 dark:bg-stone-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-semibold text-stone-700 dark:text-stone-300">
              Aperçu des ingrédients
            </p>
          </div>

          {Object.entries(ingredientsByCategory).map(([category, categoryIngredients]) => {
            const allSelected = categoryIngredients.every(ing => ing.selected);
            const someSelected = categoryIngredients.some(ing => ing.selected);
            const isExpanded = expandedCategories.has(category);
            const categoryEmoji = CATEGORIES[category]?.emoji || "📦";

            return (
              <div key={category} className="space-y-1.5">
                {/* En-tête de catégorie */}
                <div className="flex items-center gap-2 py-2.5 px-3 bg-white dark:bg-stone-800 rounded-lg border shadow-sm">
                  <button
                    onClick={() => toggleCategoryExpand(category)}
                    className="flex items-center gap-2 flex-1 text-left hover:bg-stone-50 dark:hover:bg-stone-700 rounded px-1.5 py-1 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-stone-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-stone-500 flex-shrink-0" />
                    )}
                    <span className="text-lg flex-shrink-0">{categoryEmoji}</span>
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      {category}
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      ({categoryIngredients.filter(ing => ing.selected).length}/{categoryIngredients.length})
                    </span>
                  </button>

                  <button
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      allSelected
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                        : someSelected
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-400 dark:hover:bg-stone-600'
                    }`}
                  >
                    {allSelected ? (
                      <>
                        <Check className="h-3 w-3" />
                        Tout
                      </>
                    ) : (
                      'Tout'
                    )}
                  </button>
                </div>

                {/* Liste des ingrédients */}
                {isExpanded && (
                  <div className="ml-6 space-y-1">
                    {categoryIngredients.map((ingredient) => (
                      <div
                        key={ingredient.id}
                        className="flex items-start gap-2 py-1.5 px-2 hover:bg-white dark:hover:bg-stone-800 rounded transition-colors"
                      >
                        <Checkbox
                          id={ingredient.id}
                          checked={ingredient.selected}
                          onCheckedChange={() => toggleIngredient(ingredient.id)}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor={ingredient.id}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          <div className={`${ingredient.selected ? 'text-stone-700 dark:text-stone-300' : 'text-stone-500 dark:text-stone-500 line-through'}`}>
                            {ingredient.displayName}
                          </div>
                          <div className="text-xs text-stone-400 dark:text-stone-600">
                            {ingredient.recipeName}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleAddIngredients}
          disabled={selectedIngredientsCount === 0 || isAdding || isLoadingIngredients}
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
              Ajouter ({selectedIngredientsCount})
            </>
          )}
        </Button>
        {!inDialog && (
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery("");
              setSearchResults([]);
              setSelectedRecipes([]);
              setIngredientsPreview([]);
              setShowDropdown(false);
            }}
            disabled={isLoadingIngredients}
          >
            Annuler
          </Button>
        )}
      </div>
    </div>
  );

  if (inDialog) {
    return content;
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-stone-50 dark:bg-stone-900/50">
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
            setIngredientsPreview([]);
            setShowDropdown(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {content}
    </div>
  );
}
