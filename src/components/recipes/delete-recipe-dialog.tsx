"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteRecipe } from "@/actions/recipes";

interface DeleteRecipeDialogProps {
  recipeId: number;
  recipeName: string;
  trigger: React.ReactNode;
  redirectAfterDelete?: boolean;
}

export function DeleteRecipeDialog({
  recipeId,
  recipeName,
  trigger,
  redirectAfterDelete = false,
}: DeleteRecipeDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteRecipe(recipeId);
      if (result.success) {
        setOpen(false);
        if (redirectAfterDelete) {
          router.push("/recipes");
        } else {
          router.refresh();
        }
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } catch {
      setError("Une erreur inattendue s'est produite");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Supprimer cette recette ?</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer &quot;{recipeName}&quot; ? Cette
            action est irréversible.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            {error}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Annuler
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            variant="destructive"
          >
            {loading ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

