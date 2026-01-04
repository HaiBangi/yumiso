"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RecipeForm } from "./recipe-form";
import { DuplicateRecipeButton } from "./duplicate-recipe-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserButton } from "@/components/auth/user-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Recipe } from "@/types/recipe";

export function HeaderActions() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  // Check if user can create recipes (OWNER, ADMIN or CONTRIBUTOR)
  const canCreateRecipe = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN" || session?.user?.role === "CONTRIBUTOR";

  // Fetch recipe if we're on a recipe detail page
  useEffect(() => {
    const paths = pathname.split("/").filter(Boolean);
    const lastSegment = paths[paths.length - 1];

    // Check if we're on a recipe detail page (by ID or slug)
    // URLs can be /recipes/123 or /recipes/mon-slug-de-recette
    // The API /api/recipes/[id] already supports both ID and slug
    if (paths[0] === "recipes" && lastSegment && lastSegment !== "recipes") {
      fetch(`/api/recipes/${lastSegment}`)
        .then((res) => {
          if (!res.ok) throw new Error("Recipe not found");
          return res.json();
        })
        .then((data) => setRecipe(data))
        .catch(() => setRecipe(null));
    } else {
      setRecipe(null);
    }
  }, [pathname]);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {canCreateRecipe && (
        <>
          {/* Show duplicate button if we're on a recipe page */}
          {recipe && (
            <DuplicateRecipeButton recipe={recipe} />
          )}

          <RecipeForm
            trigger={
              <Button
                className="bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-400 hover:bg-amber-50 dark:hover:bg-stone-700 gap-1.5 sm:gap-2 h-9 sm:h-10 md:h-11 px-3 sm:px-4 md:px-5 text-sm sm:text-base cursor-pointer shadow-md"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Nouvelle recette</span>
              </Button>
            }
          />
        </>
      )}
      <ThemeToggle />
      <UserButton />
    </div>
  );
}
