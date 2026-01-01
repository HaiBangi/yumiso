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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";

interface AddRecipesButtonProps {
  onAddIngredients: (ingredients: Array<{ name: string; category: string }>) => Promise<void>;
  accentColor?: "emerald" | "blue";
  disabled?: boolean;
  compact?: boolean; // Mode compact (icône seule) pour mobile
}

export function AddRecipesButton({ onAddIngredients, accentColor = "emerald", disabled = false, compact = false }: AddRecipesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const title = "Ajouter les ingrédients de recettes";

  const content = (
    <AddRecipeIngredients
      onAddIngredients={async (ingredients) => {
        await onAddIngredients(ingredients);
        setIsOpen(false);
      }}
      accentColor={accentColor}
      inDialog={true}
    />
  );

  return (
    <>
      {compact ? (
        <Button
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0 bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600"
        >
          <ChefHat className="h-3.5 w-3.5" />
        </Button>
      ) : (
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
      )}

      {isDesktop ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent size="wide" className="min-h-[60vh] max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                {title}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 pr-2 -mr-2">
              {content}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                {title}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {content}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
