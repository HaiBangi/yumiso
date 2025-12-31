"use client";

import { useState } from "react";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddRecipeIngredients } from "./add-recipe-ingredients";

interface AddRecipesButtonProps {
  onAddIngredients: (ingredients: Array<{ name: string; category: string }>) => Promise<void>;
  accentColor?: "emerald" | "blue";
  disabled?: boolean;
}

export function AddRecipesButton({ onAddIngredients, accentColor = "emerald", disabled = false }: AddRecipesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        size="sm"
        variant="outline"
        className="gap-2 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
      >
        <ChefHat className="h-4 w-4" />
        Ajouter des recettes
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Ajouter les ingrédients de recettes
            </DialogTitle>
          </DialogHeader>

          <AddRecipeIngredients
            onAddIngredients={async (ingredients) => {
              await onAddIngredients(ingredients);
              setIsOpen(false);
            }}
            accentColor={accentColor}
            inDialog={true}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
