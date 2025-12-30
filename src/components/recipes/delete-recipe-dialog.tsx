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
import { useDeleteRecipe } from "@/hooks/use-recipe-query";
import { toast } from "@/components/ui/use-toast";

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
  const [open, setOpen] = useState(false);
  const deleteRecipeMutation = useDeleteRecipe();

  const handleDelete = () => {
    deleteRecipeMutation.mutate(recipeId, {
      onSuccess: () => {
        toast({
          title: "Recette supprimée",
          description: "La recette a été supprimée avec succès",
        });
        setOpen(false);
        if (redirectAfterDelete) {
          router.push("/recipes");
        } else {
          router.refresh();
        }
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: error instanceof Error ? error.message : "Erreur lors de la suppression",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Supprimer cette recette ?</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer &quot;{recipeName}&quot; ? Cette
            action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteRecipeMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleteRecipeMutation.isPending}
            variant="destructive"
          >
            {deleteRecipeMutation.isPending ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

