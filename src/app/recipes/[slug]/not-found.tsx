import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChefHat, ArrowLeft } from "lucide-react";

export default function RecipeNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-stone-100 dark:bg-stone-800 mb-6">
          <ChefHat className="h-10 w-10 text-stone-400" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100 mb-3">
          Recette introuvable
        </h1>
        <p className="text-stone-600 dark:text-stone-400 mb-8 max-w-md">
          La recette que vous recherchez n&apos;existe pas ou a été supprimée.
        </p>
        <Button asChild>
          <Link href="/recipes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux recettes
          </Link>
        </Button>
      </div>
    </main>
  );
}

