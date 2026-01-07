﻿"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, X, AlertTriangle, Loader2 } from "lucide-react";
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
import { deleteMultipleRecipes } from "@/actions/recipes";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types/recipe";
interface DeletionModeProps {
  isActive: boolean;
  onToggle: () => void;
}
export function DeletionModeToggle({ isActive, onToggle }: DeletionModeProps) {
  return (
    <Button
      onClick={onToggle}
      variant={isActive ? "destructive" : "outline"}
      className={cn(
        "gap-2 h-10 font-medium transition-all",
        isActive
          ? "bg-red-600 hover:bg-red-700 border-red-700"
          : "hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 hover:text-red-600"
      )}
    >
      {isActive ? (
        <>
          <X className="h-4 w-4" />
          Quitter le mode suppression
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          Mode suppression
        </>
      )}
    </Button>
  );
}
interface DeletionActionsProps {
  selectedIds: Set<number>;
  selectedRecipes: Recipe[];
  onClear: () => void;
}
export function DeletionActions({ selectedIds, selectedRecipes, onClear }: DeletionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteMultipleRecipes(Array.from(selectedIds));
      if (result.success) {
        onClear();
        setShowConfirm(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };
  if (selectedIds.size === 0) return null;
  return (
    <>
      {/* Barre d'actions flottante sobre */}
      <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2" style={{ zIndex: 'var(--z-popover)' }}>
        <div className="bg-white dark:bg-stone-900 border-2 border-red-500 dark:border-red-600 rounded-xl shadow-xl p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          {/* Indicateur visuel sobre */}
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-red-600 dark:text-red-500">
                Mode suppression actif
              </p>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                {selectedIds.size} recette{selectedIds.size > 1 ? "s" : ""} sélectionnée{selectedIds.size > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {/* Boutons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={isPending}
            >
              Désélectionner
            </Button>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={isPending}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer ({selectedIds.size})
            </Button>
          </div>
        </div>
      </div>
      {/* Dialog de confirmation sobre */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="border-l-4 border-l-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Vous êtes sur le point de supprimer définitivement <strong className="text-red-600 dark:text-red-500">{selectedIds.size} recette{selectedIds.size > 1 ? "s" : ""}</strong> :
                </p>
                {/* Liste des recettes à supprimer */}
                <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <ul className="space-y-2">
                    {selectedRecipes.map((recipe) => (
                      <li key={recipe.id} className="text-sm">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                          {recipe.name}
                        </span>
                        {recipe.author && (
                          <span className="text-stone-600 dark:text-stone-400 ml-1">
                            — par <span className="italic">{recipe.author}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    ⚠️ Cette action est irréversible
                  </p>
                </div>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-2">
                    {error}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer définitivement"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
interface RecipeCheckboxProps {
  recipeId: number;
  isSelected: boolean;
  onToggle: (id: number) => void;
}
export function RecipeCheckbox({ recipeId, isSelected, onToggle }: RecipeCheckboxProps) {
  return (
    <div className="absolute top-2 left-2 z-10">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(recipeId)}
        className={cn(
          "h-6 w-6 border-2 shadow-lg",
          isSelected
            ? "bg-red-600 border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-700"
            : "border-white bg-white hover:border-red-300"
        )}
      />
    </div>
  );
}
