"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RecipeList, ViewProvider } from "@/components/recipes/recipe-list";
import { AutoOpenRecipeForm } from "@/components/recipes/auto-open-recipe-form";
import { RecipeDetailSheet } from "@/components/meal-planner/recipe-detail-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChefHat, Plus, Globe, FileText, EyeOff, Filter, Trash2, RotateCcw, Clock, Loader2, AlertTriangle } from "lucide-react";
import { RecipeStatus } from "@/lib/recipe-status";
import { categoryLabels } from "@/lib/category-labels";
import { formatTime } from "@/lib/utils";
import { restoreMultipleRecipes, permanentlyDeleteRecipes } from "@/actions/recipes";
import { RecipeImage } from "./recipe-image";
import type { Recipe } from "@/types/recipe";

type StatusFilter = "ALL" | "PUBLIC" | "DRAFT" | "PRIVATE";
type DeletedMode = "none" | "restore" | "delete";

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
  ingredients?: any[];
  ingredientGroups?: any[];
  steps?: any[];
}

interface MyRecipesContentProps {
  recipes: Recipe[];
  deletedRecipes?: DeletedRecipe[];
}

const statusFilters: { value: StatusFilter; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "ALL", label: "Toutes", icon: <Filter className="h-3.5 w-3.5" />, color: "bg-stone-600 dark:bg-stone-500" },
  { value: "PUBLIC", label: "Publiques", icon: <Globe className="h-3.5 w-3.5" />, color: "bg-emerald-600 dark:bg-emerald-500" },
  { value: "DRAFT", label: "Brouillons", icon: <FileText className="h-3.5 w-3.5" />, color: "bg-amber-500 dark:bg-amber-500" },
  { value: "PRIVATE", label: "Privées", icon: <EyeOff className="h-3.5 w-3.5" />, color: "bg-indigo-600 dark:bg-indigo-500" },
];

export function MyRecipesContent({ recipes, deletedRecipes = [] }: MyRecipesContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active");
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<Set<number>>(new Set());
  const [deletedMode, setDeletedMode] = useState<DeletedMode>("none");
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<DeletedRecipe | null>(null);

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
        setDeletedMode("none");
        router.refresh();
      }
    });
  };

  // Supprimer définitivement les recettes sélectionnées (ouvre le dialog)
  const handlePermanentDelete = () => {
    if (selectedDeletedIds.size === 0) return;
    setShowDeleteConfirmDialog(true);
  };

  // Confirmer la suppression définitive
  const confirmPermanentDelete = () => {
    setShowDeleteConfirmDialog(false);

    startTransition(async () => {
      const result = await permanentlyDeleteRecipes(Array.from(selectedDeletedIds));
      if (result.success) {
        setSelectedDeletedIds(new Set());
        setDeletedMode("none");
        router.refresh();
      }
    });
  };

  // Annuler le mode
  const cancelMode = () => {
    setDeletedMode("none");
    setSelectedDeletedIds(new Set());
  };

  // Noms des recettes sélectionnées pour le dialog
  const selectedRecipeNames = deletedRecipes
    .filter(r => selectedDeletedIds.has(r.id))
    .map(r => r.name);

  const handleRestoreFromSheet = () => {
    if (!viewingRecipe) return;
    setSelectedDeletedIds(new Set([viewingRecipe.id]));
    startTransition(async () => {
      const result = await restoreMultipleRecipes([viewingRecipe.id]);
      if (result.success) {
        setViewingRecipe(null);
        router.refresh();
      }
    });
  };

  return (
    <ViewProvider>
      <AutoOpenRecipeForm trigger={<span className="hidden" />} />

      {/* Header */}
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

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "active" | "deleted"); cancelMode(); }} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="active" className="gap-2">
            <ChefHat className="h-4 w-4" />
            Actives
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">{recipes.length}</span>
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Supprimées
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">{deletedRecipes.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Actives */}
        <TabsContent value="active" className="mt-0">
          {recipes.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm mb-6 w-fit">
              {statusFilters.map((filter) => {
                const isActive = statusFilter === filter.value;
                const count = counts[filter.value];
                return (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                      isActive ? `${filter.color} text-white shadow-sm` : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700"
                    }`}
                  >
                    {filter.icon}
                    <span className="hidden sm:inline">{filter.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-300"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {recipes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700">
              <ChefHat className="h-16 w-16 mx-auto text-stone-300 dark:text-stone-600 mb-4" />
              <h2 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">Aucune recette pour le moment</h2>
              <p className="text-stone-500 dark:text-stone-400 mb-6">Commencez à créer vos propres recettes !</p>
              <AutoOpenRecipeForm trigger={<Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"><Plus className="h-4 w-4" />Créer ma première recette</Button>} />
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${statusFilter === "DRAFT" ? "bg-amber-100 dark:bg-amber-900/30" : statusFilter === "PRIVATE" ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                {statusFilter === "DRAFT" && <FileText className="h-8 w-8 text-amber-500" />}
                {statusFilter === "PRIVATE" && <EyeOff className="h-8 w-8 text-indigo-500" />}
                {statusFilter === "PUBLIC" && <Globe className="h-8 w-8 text-emerald-500" />}
              </div>
              <h2 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">Aucune recette {statusFilters.find(f => f.value === statusFilter)?.label.toLowerCase()}</h2>
              <Button variant="outline" onClick={() => setStatusFilter("ALL")} className="cursor-pointer">Voir toutes les recettes</Button>
            </div>
          ) : (
            <RecipeList recipes={filteredRecipes} />
          )}
        </TabsContent>

        {/* Onglet Supprimées */}
        <TabsContent value="deleted" className="mt-0">
          {deletedRecipes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-stone-100 dark:bg-stone-700">
                <Trash2 className="h-8 w-8 text-stone-400 dark:text-stone-500" />
              </div>
              <h2 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">Aucune recette supprimée</h2>
              <p className="text-stone-500 dark:text-stone-400">Les recettes que vous supprimez apparaîtront ici.</p>
            </div>
          ) : (
            <>
              {/* Barre d'actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 p-3 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-3">
                  {deletedMode !== "none" ? (
                    <>
                      <Checkbox checked={selectedDeletedIds.size === deletedRecipes.length} onCheckedChange={toggleSelectAll} className="h-5 w-5" />
                      <span className="text-sm text-stone-600 dark:text-stone-400">{selectedDeletedIds.size} sélectionnée{selectedDeletedIds.size !== 1 ? "s" : ""}</span>
                    </>
                  ) : (
                    <span className="text-sm text-stone-600 dark:text-stone-400">{deletedRecipes.length} recette{deletedRecipes.length !== 1 ? "s" : ""} supprimée{deletedRecipes.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {deletedMode !== "none" ? (
                    <>
                      <Button variant="outline" size="sm" onClick={cancelMode} disabled={isPending}>Annuler</Button>
                      {deletedMode === "restore" && (
                        <Button size="sm" onClick={handleRestore} disabled={selectedDeletedIds.size === 0 || isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                          Restaurer ({selectedDeletedIds.size})
                        </Button>
                      )}
                      {deletedMode === "delete" && (
                        <Button size="sm" variant="destructive" onClick={handlePermanentDelete} disabled={selectedDeletedIds.size === 0 || isPending} className="gap-2">
                          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Supprimer ({selectedDeletedIds.size})
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setDeletedMode("restore")} className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400">
                        <RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">Restaurer</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeletedMode("delete")} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400">
                        <Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Supprimer définitivement</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Liste des recettes supprimées */}
              <div className="grid gap-3">
                {deletedRecipes.map((recipe) => (
                  <Card
                    key={recipe.id}
                    className={`p-4 transition-all cursor-pointer hover:shadow-md ${
                      deletedMode !== "none" && selectedDeletedIds.has(recipe.id)
                        ? deletedMode === "delete" ? "ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20" : "ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/50"
                    }`}
                    onClick={() => deletedMode !== "none" ? toggleDeletedSelection(recipe.id) : setViewingRecipe(recipe)}
                  >
                    <div className="flex items-center gap-4">
                      {deletedMode !== "none" && (
                        <Checkbox checked={selectedDeletedIds.has(recipe.id)} onCheckedChange={() => toggleDeletedSelection(recipe.id)} className="h-5 w-5" onClick={(e) => e.stopPropagation()} />
                      )}
                      <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-700 flex-shrink-0">
                        <RecipeImage src={recipe.imageUrl} alt={recipe.name} sizes="64px" className="object-cover" iconSize="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-stone-900 dark:text-stone-100 truncate">{recipe.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-stone-500 dark:text-stone-400">
                          <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded text-xs">{categoryLabels[recipe.category] || recipe.category}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime(recipe.preparationTime + recipe.cookingTime)}</span>
                        </div>
                        {recipe.deletedAt && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">Supprimée le {new Date(recipe.deletedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                        )}
                      </div>
                      {deletedMode === "none" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDeletedIds(new Set([recipe.id]));
                            startTransition(async () => {
                              const result = await restoreMultipleRecipes([recipe.id]);
                              if (result.success) router.refresh();
                            });
                          }}
                          disabled={isPending}
                          className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                        >
                          {isPending && selectedDeletedIds.has(recipe.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
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

      {/* Dialog de confirmation de suppression définitive */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30"><AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" /></div>
              <AlertDialogTitle className="text-xl">Suppression définitive</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left space-y-3">
              <p>Vous êtes sur le point de supprimer définitivement <strong className="text-stone-900 dark:text-stone-100">{selectedDeletedIds.size} recette{selectedDeletedIds.size !== 1 ? "s" : ""}</strong>.</p>
              {selectedRecipeNames.length <= 5 && (
                <ul className="list-disc list-inside text-sm text-stone-600 dark:text-stone-400 space-y-1">
                  {selectedRecipeNames.map((name, i) => (<li key={i} className="truncate">{name}</li>))}
                </ul>
              )}
              <p className="text-red-600 dark:text-red-400 font-medium text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Cette action est irréversible. Toutes les données associées seront perdues.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="mt-0">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPermanentDelete} className="bg-red-600 hover:bg-red-700 text-white gap-2"><Trash2 className="h-4 w-4" />Supprimer définitivement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* RecipeDetailSheet pour voir les détails d'une recette supprimée */}
      <RecipeDetailSheet
        open={!!viewingRecipe}
        onOpenChange={(open) => !open && setViewingRecipe(null)}
        deletedRecipe={viewingRecipe}
        onRestore={handleRestoreFromSheet}
        isRestoring={isPending}
      />
    </ViewProvider>
  );
}
