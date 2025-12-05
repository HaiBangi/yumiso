"use client";

import { useSession } from "next-auth/react";
import { RecipeForm } from "./recipe-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserButton } from "@/components/auth/user-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function HeaderActions() {
  const { data: session } = useSession();
  
  // Check if user can create recipes (ADMIN or CONTRIBUTOR)
  const canCreateRecipe = session?.user?.role === "ADMIN" || session?.user?.role === "CONTRIBUTOR";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {canCreateRecipe && (
        <RecipeForm
          trigger={
            <Button
              className="bg-white text-amber-600 hover:bg-amber-50 gap-1.5 sm:gap-2 h-9 sm:h-10 md:h-11 px-3 sm:px-4 md:px-5 text-sm sm:text-base cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Nouvelle recette</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          }
        />
      )}
      <ThemeToggle />
      <UserButton />
    </div>
  );
}

