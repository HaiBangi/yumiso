"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RecipeList, ViewProvider } from "@/components/recipes/recipe-list";
import { AutoOpenRecipeForm } from "@/components/recipes/auto-open-recipe-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChefHat, Plus, Globe, FileText, EyeOff, Filter, Trash2, RotateCcw, Clock, Loader2 } from "lucide-react";
import { RecipeStatus } from "@/lib/recipe-status";
import { categoryLabels } from "@/lib/category-labels";
import { formatTime } from "@/lib/utils";
import { restoreMultipleRecipes } from "@/actions/recipes";
import { RecipeImage } from "./recipe-image";
import type { Recipe } from "@/types/recipe";

type StatusFilter = "ALL" | "PUBLIC" | "DRAFT" | "PRIVATE";

interface DeletedRecipe {
  id: number;
  name: string;
  slug: string | null;
  category: string;
  imageUrl: string | null;
  author: string;
  deletedAt: Date | null;
  preparationTime: number;
  cookingTime: number;
  servings: number;
}

interface MyRecipesContentProps {
  recipes: Recipe[];
  deletedRecipes?: DeletedRecipe[];
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

export function MyRecipesContent({ recipes, deletedRecipes = [] }: MyRecipesContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active");
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<Set<number>>(new Set());
  const [isRestoreMode, setIsRestoreMode] = useState(false);

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

  // Toggle sélection d'une recette supprimée
  const toggleDeletedSelection = (id: number) => {
    const newSet = new Set(selectedDeletedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDeletedIds(newSet);
  };

  // Sélectionner/désélectionner tout
  const toggleSelectAll = () => {
    if (selectedDeletedIds.size === deletedRecipes.length) {
      setSelectedDeletedIds(new Set());
    } else {
      setSelectedDeletedIds(new Set(deletedRecipes.map(r => r.id)));
    }
  };

  // Restaurer les recettes sélectionnées
  const handleRestore = () => {
    if (selectedDeletedIds.size === 0) return;

    startTransition(async () => {
      const result = await restoreMultipleRecipes(Array.from(selectedDeletedIds));
      if (result.success) {
        setSelectedDeletedIds(new Set());
        setIsRestoreMode(false);
        router.refresh();
      }
    });
  };

  // Annuler le mode restauration
  const cancelRestoreMode = () => {
    setIsRestoreMode(false);
    setSelectedDeletedIds(new Set());
  };

  return (
    <ViewProvider>
      {/* Composant invisible pour gérer l'ouverture automatique depuis le meal planner */}
      <AutoOpenRecipeForm trigger={<span className="hidden" />} />

      {/* Header avec titre */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-700 to-green-600 shadow-md">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">Mes recettes</h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              {recipes.length} recette{recipes.length !== 1 ? "s" : ""} • {deletedRecipes.length} supprimée{deletedRecipes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Onglets Actives / Supprimées */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "deleted")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="active" className="gap-2">
            <ChefHat className="h-4 w-4" />
            Actives
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              {recipes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Supprimées
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
              {deletedRecipes.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Contenu onglet Actives */}
        <TabsContent value="active" className="mt-0">
          {/* Status Filter Buttons */}
          {recipes.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm mb-6 w-fit">
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
        </TabsContent>

        {/* Contenu onglet Supprimées */}
        <TabsContent value="deleted" className="mt-0">
          {deletedRecipes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-stone-100 dark:bg-stone-700">
                <Trash2 className="h-8 w-8 text-stone-400 dark:text-stone-500" />
              </div>
              <h2 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">
                Aucune recette supprimée
              </h2>
              <p className="text-stone-500 dark:text-stone-400">
                Les recettes que vous supprimez apparaîtront ici.
              </p>
            </div>
          ) : (
            <>
              {/* Barre d'actions pour le mode restauration */}
              <div className="flex items-center justify-between mb-4 p-3 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-3">
                  {isRestoreMode ? (
                    <>
                      <Checkbox
                        checked={selectedDeletedIds.size === deletedRecipes.length}
                        onCheckedChange={toggleSelectAll}
                        className="h-5 w-5"
                      />
                      <span className="text-sm text-stone-600 dark:text-stone-400">
                        {selectedDeletedIds.size} sélectionnée{selectedDeletedIds.size !== 1 ? "s" : ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-stone-600 dark:text-stone-400">
                      {deletedRecipes.length} recette{deletedRecipes.length !== 1 ? "s" : ""} supprimée{deletedRecipes.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isRestoreMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelRestoreMode}
                        disabled={isPending}
                      >
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleRestore}
                        disabled={selectedDeletedIds.size === 0 || isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Restaurer ({selectedDeletedIds.size})
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsRestoreMode(true)}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Mode restauration
                    </Button>
                  )}
                </div>
              </div>

              {/* Liste des recettes supprimées */}
              <div className="grid gap-3">
                {deletedRecipes.map((recipe) => (
                  <Card
                    key={recipe.id}
                    className={`p-4 transition-all ${
                      isRestoreMode && selectedDeletedIds.has(recipe.id)
                        ? "ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "bg-white dark:bg-stone-800"
                    } ${isRestoreMode ? "cursor-pointer" : ""}`}
                    onClick={() => isRestoreMode && toggleDeletedSelection(recipe.id)}
                  >
                    <div className="flex items-center gap-4">
                      {isRestoreMode && (
                        <Checkbox
                          checked={selectedDeletedIds.has(recipe.id)}
                          onCheckedChange={() => toggleDeletedSelection(recipe.id)}
                          className="h-5 w-5"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-700 flex-shrink-0">
                        <RecipeImage
                          src={recipe.imageUrl}
                          alt={recipe.name}
                          sizes="64px"
                          className="object-cover"
                          iconSize="sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {recipe.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-stone-500 dark:text-stone-400">
                          <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded text-xs">
                            {categoryLabels[recipe.category] || recipe.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(recipe.preparationTime + recipe.cookingTime)}
                          </span>
                        </div>
                        {recipe.deletedAt && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            Supprimée le {new Date(recipe.deletedAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric"
                            })}
                          </p>
                        )}
                      </div>
                      {!isRestoreMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDeletedIds(new Set([recipe.id]));
                            startTransition(async () => {
                              const result = await restoreMultipleRecipes([recipe.id]);
                              if (result.success) {
                                router.refresh();
                              }
                            });
                          }}
                          disabled={isPending}
                          className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                        >
                          {isPending && selectedDeletedIds.has(recipe.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Restaurer</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </ViewProvider>
  );
}
