"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CreateRecipeButtonProps {
  className?: string;
  children?: React.ReactNode;
}

function CreateRecipeButtonInner({ className, children }: CreateRecipeButtonProps) {
  const searchParams = useSearchParams();
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Vérifier si on vient du meal planner
    const createFromMealPlanner = searchParams.get('createFromMealPlanner');
    
    if (createFromMealPlanner === 'true') {
      // Vérifier qu'il y a des données dans le localStorage
      try {
        const saved = localStorage.getItem('yumiso_new_recipe_draft');
        if (saved) {
          setShouldAutoOpen(true);
          // Nettoyer l'URL sans recharger la page
          window.history.replaceState({}, '', '/profile/recipes');
        }
      } catch (e) {
        console.error('Erreur lors de la récupération du draft:', e);
      }
    }
    setIsReady(true);
  }, [searchParams]);

  // Attendre que le composant soit prêt
  if (!isReady) {
    return (
      <Button className={className || "bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"} disabled>
        <Plus className="h-4 w-4" />
        Nouvelle recette
      </Button>
    );
  }

  return (
    <RecipeForm
      defaultOpen={shouldAutoOpen}
      trigger={
        children || (
          <Button className={className || "bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"}>
            <Plus className="h-4 w-4" />
            Nouvelle recette
          </Button>
        )
      }
    />
  );
}

export function CreateRecipeButton(props: CreateRecipeButtonProps) {
  return (
    <Suspense fallback={
      <Button className={props.className || "bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"} disabled>
        <Plus className="h-4 w-4" />
        Nouvelle recette
      </Button>
    }>
      <CreateRecipeButtonInner {...props} />
    </Suspense>
  );
}