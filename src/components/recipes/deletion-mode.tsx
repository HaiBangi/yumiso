"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, X, AlertTriangle } from "lucide-react";
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
        "gap-2",
        isActive && "bg-red-600 hover:bg-red-700"
      )}
    >
      {isActive ? (
        <>
          <X className="h-4 w-4" />
          Annuler
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
  onClear: () => void;
}

export function DeletionActions({ selectedIds, onClear }: DeletionActionsProps) {
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-red-500 rounded-lg shadow-2xl p-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="font-semibold text-stone-900">
            {selectedIds.size} recette{selectedIds.size > 1 ? "s" : ""} sélectionnée{selectedIds.size > 1 ? "s" : ""}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={isPending}
          >
            Désélectionner tout
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={isPending}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer ({selectedIds.size})
          </Button>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Êtes-vous sûr de vouloir supprimer <strong>{selectedIds.size} recette{selectedIds.size > 1 ? "s" : ""}</strong> ?
              </p>
              <p className="text-red-600 font-semibold">
                Cette action est irréversible !
              </p>
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? "Suppression..." : "Supprimer définitivement"}
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
        className="h-6 w-6 border-2 border-white shadow-lg bg-white data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
      />
    </div>
  );
}

