"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Search, X, Loader2, Trash2, Clock } from "lucide-react";
import { addRecipesToCollection, removeRecipeFromCollection } from "@/actions/collections";
import { categoryLabels } from "@/lib/category-labels";
import { useMediaQuery } from "@/hooks/use-media-query";

interface Recipe {
  id: number;
  name: string;
  imageUrl: string | null;
  category: string;
  preparationTime: number;
  cookingTime: number;
}

interface CollectionRecipe extends Recipe {
  _count: {
    comments: number;
  };
}

interface CollectionDetailProps {
  collection: {
    id: number;
    name: string;
    description: string | null;
    color: string;
    recipes: CollectionRecipe[];
  };
  allRecipes: Recipe[];
}

// Fonction pour normaliser les chaînes (enlever accents et casse)
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function CollectionDetail({ collection, allRecipes }: CollectionDetailProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);
  const [isAddingRecipes, setIsAddingRecipes] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [removingRecipeId, setRemovingRecipeId] = useState<number | null>(null);
  const [loadingRecipeId, setLoadingRecipeId] = useState<number | null>(null);

  // Recettes déjà dans la collection
  const collectionRecipeIds = useMemo(
    () => new Set(collection.recipes.map(r => r.id)),
    [collection.recipes]
  );

  // Recettes disponibles (pas encore dans la collection)
  const availableRecipes = useMemo(
    () => allRecipes.filter(r => !collectionRecipeIds.has(r.id)),
    [allRecipes, collectionRecipeIds]
  );

  // Filtrer les recettes par recherche (insensible à la casse et aux accents)
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return availableRecipes;

    const normalizedQuery = normalizeString(searchQuery);
    
    return availableRecipes.filter(recipe => {
      const normalizedName = normalizeString(recipe.name);
      const normalizedCategory = normalizeString(categoryLabels[recipe.category] || recipe.category);
      
      return normalizedName.includes(normalizedQuery) || normalizedCategory.includes(normalizedQuery);
    });
  }, [availableRecipes, searchQuery]);

  const handleToggleRecipe = useCallback((recipeId: number) => {
    setSelectedRecipes(prev =>
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  }, []);

  const handleAddRecipes = useCallback(async () => {
    if (selectedRecipes.length === 0) return;

    setIsAddingRecipes(true);
    try {
      const result = await addRecipesToCollection(collection.id, selectedRecipes);
      
      if (result.success) {
        setSelectedRecipes([]);
        setSearchQuery("");
        setIsOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Error adding recipes:", error);
    } finally {
      setIsAddingRecipes(false);
    }
  }, [selectedRecipes, collection.id, router]);

  const handleRemoveRecipe = useCallback(async (recipeId: number) => {
    setRemovingRecipeId(recipeId);
    try {
      const result = await removeRecipeFromCollection(collection.id, recipeId);
      
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Error removing recipe:", error);
    } finally {
      setRemovingRecipeId(null);
    }
  }, [collection.id, router]);

  const handleRecipeClick = useCallback((recipeId: number) => {
    setLoadingRecipeId(recipeId);
  }, []);

  // Composant pour le contenu du dialog - simple fonction
  const AddRecipesContent = () => (
    <>
      {/* Search Bar */}
      <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une recette... (ex: pates, poulet)"
            className="pl-10 pr-10"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
          {filteredRecipes.length} recette{filteredRecipes.length > 1 ? 's' : ''} disponible{filteredRecipes.length > 1 ? 's' : ''}
          {selectedRecipes.length > 0 && ` · ${selectedRecipes.length} sélectionnée${selectedRecipes.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Recipes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {filteredRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-stone-300 dark:text-stone-600 mb-3" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {searchQuery ? "Aucune recette trouvée" : "Toutes les recettes sont déjà dans cette collection"}
            </p>
          </div>
        ) : (
          filteredRecipes.map((recipe) => (
            <label
              key={recipe.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selectedRecipes.includes(recipe.id)}
                onCheckedChange={() => handleToggleRecipe(recipe.id)}
              />
              
              {/* Recipe Image */}
              <div className="w-16 h-16 rounded-md bg-stone-100 dark:bg-stone-700 overflow-hidden flex-shrink-0">
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 dark:text-stone-500">
                    <Search className="h-6 w-6" />
                  </div>
                )}
              </div>

              {/* Recipe Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-stone-900 dark:text-stone-100 truncate">
                  {recipe.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {categoryLabels[recipe.category] || recipe.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                    <Clock className="h-3 w-3" />
                    {recipe.preparationTime + recipe.cookingTime} min
                  </div>
                </div>
              </div>
            </label>
          ))
        )}
      </div>

      {/* Footer with Actions */}
      <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 flex-shrink-0">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setSelectedRecipes([]);
              setSearchQuery("");
            }}
            className="flex-1"
            disabled={isAddingRecipes}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleAddRecipes}
            disabled={selectedRecipes.length === 0 || isAddingRecipes}
            className="flex-1"
          >
            {isAddingRecipes && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ajouter {selectedRecipes.length > 0 && `(${selectedRecipes.length})`}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/profile/collections">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Retour</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                {collection.description}
              </p>
            )}
          </div>
        </div>

        {/* Add Recipes Button - Desktop: Dialog, Mobile: Sheet */}
        {isMobile ? (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter des recettes
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-3xl flex flex-col">
              <SheetHeader className="p-4 pb-3 border-b border-stone-200 dark:border-stone-700 flex-shrink-0">
                <SheetTitle>Ajouter des recettes</SheetTitle>
                <SheetDescription>
                  Recherchez et sélectionnez les recettes à ajouter
                </SheetDescription>
              </SheetHeader>
              <AddRecipesContent />
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter des recettes
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col">
              <DialogHeader className="p-4 pb-3 border-b border-stone-200 dark:border-stone-700 flex-shrink-0">
                <DialogTitle>Ajouter des recettes</DialogTitle>
                <DialogDescription>
                  Recherchez et sélectionnez les recettes à ajouter à cette collection
                </DialogDescription>
              </DialogHeader>
              <AddRecipesContent />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-stone-600 dark:text-stone-400">
        <span>{collection.recipes.length} recette{collection.recipes.length > 1 ? 's' : ''}</span>
      </div>

      {/* Recipes Grid */}
      {collection.recipes.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <Plus className="h-12 w-12 text-stone-300 dark:text-stone-600 mb-3" />
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
              Aucune recette
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 text-center max-w-md mb-4">
              Commencez à ajouter des recettes à cette collection
            </p>
            {isMobile ? (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter des recettes
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-3xl flex flex-col">
                  <SheetHeader className="p-4 pb-3 border-b border-stone-200 dark:border-stone-700 flex-shrink-0">
                    <SheetTitle>Ajouter des recettes</SheetTitle>
                    <SheetDescription>
                      Recherchez et sélectionnez les recettes à ajouter
                    </SheetDescription>
                  </SheetHeader>
                  <AddRecipesContent />
                </SheetContent>
              </Sheet>
            ) : (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter des recettes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col">
                  <DialogHeader className="p-4 pb-3 border-b border-stone-200 dark:border-stone-700 flex-shrink-0">
                    <DialogTitle>Ajouter des recettes</DialogTitle>
                    <DialogDescription>
                      Recherchez et sélectionnez les recettes à ajouter à cette collection
                    </DialogDescription>
                  </DialogHeader>
                  <AddRecipesContent />
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collection.recipes.map((recipe) => (
            <Card key={recipe.id} className="group relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <Link 
                  href={`/recipes/${recipe.id}`}
                  onClick={() => handleRecipeClick(recipe.id)}
                >
                  {/* Image */}
                  <div className="aspect-video w-full bg-stone-100 dark:bg-stone-700 overflow-hidden relative">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 dark:text-stone-500">
                        <Search className="h-8 w-8" />
                      </div>
                    )}
                    {/* Loading Overlay */}
                    {loadingRecipeId === recipe.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-2 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {recipe.name}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                      <Badge variant="secondary">
                        {categoryLabels[recipe.category] || recipe.category}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recipe.preparationTime + recipe.cookingTime} min
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRecipe(recipe.id)}
                  disabled={removingRecipeId === recipe.id}
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 dark:bg-stone-800/90 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {removingRecipeId === recipe.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
