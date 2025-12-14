"use client";

import { useState } from "react";
import { Trash2, Eye, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeDetailDialog } from "./recipe-detail-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface MealCardProps {
  meal: any;
  planId: number;
  onRefresh: () => void;
}

export function MealCard({ meal, onRefresh }: MealCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/meal-planner/meal/${meal.id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="w-full h-full p-3 bg-white dark:bg-stone-800 rounded-lg cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden border border-stone-200 dark:border-stone-700"
      >
        <div className="relative h-full flex flex-col">
          {/* Meal Name */}
          <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 mb-1">
            {meal.name}
          </h4>
          
          {/* Time info */}
          <p className="text-xs text-stone-500 dark:text-stone-400">
            ⏱ {meal.prepTime + meal.cookTime} min
          </p>
          
          {/* Calories */}
          {meal.calories && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              🔥 {meal.calories} kcal
            </p>
          )}
          
          {/* Actions */}
          <div className="mt-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetail(true);
              }}
              title="Voir les détails"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implémenter l'édition
                alert("Fonctionnalité d'édition à venir");
              }}
              title="Modifier"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              disabled={isDeleting}
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Recipe Detail Dialog */}
      <RecipeDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        meal={meal}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Supprimer ce repas ?"
        description={`Êtes-vous sûr de vouloir supprimer ${meal.name} de votre planning ? Cette action est irréversible.`}
        onConfirm={handleDelete}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isLoading={isDeleting}
        variant="destructive"
      />
    </>
  );
}
