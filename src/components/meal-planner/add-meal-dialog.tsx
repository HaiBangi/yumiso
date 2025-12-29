"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatTime } from "@/lib/utils";

// Fonction helper pour recalculer la liste de courses
async function recalculateShoppingList(planId: number) {
  try {
    await fetch("/api/meal-planner/recalculate-shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    console.log("✅ Liste de courses recalculée");
  } catch (error) {
    console.error("❌ Erreur recalcul liste de courses:", error);
  }
}

interface AddMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  slots: Array<{ day: string; time: string; type: string }>;
  onSuccess: () => void;
}

export function AddMealDialog({
  open,
  onOpenChange,
  planId,
  slots,
  onSuccess,
}: AddMealDialogProps) {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"existing" | "generate">("existing");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [portionsDesired, setPortionsDesired] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRecipes, setIsFetchingRecipes] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  
  // Pour la compatibilité, on prend le premier slot comme référence
  const primarySlot = slots.length > 0 ? slots[0] : { day: '', time: '', type: '' };
  const day = primarySlot.day;
  const timeSlot = primarySlot.time;
  const mealType = primarySlot.type;

  useEffect(() => {
    if (open && tab === "existing") {
      fetchRecipes();
    }
  }, [open, tab]);

  const fetchRecipes = async () => {
    setIsFetchingRecipes(true);
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsFetchingRecipes(false);
    }
  };

  // Fonction de normalisation de texte (enlève accents, casse, etc.)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
      .replace(/œ/g, "oe") // œ -> oe
      .replace(/æ/g, "ae"); // æ -> ae
  };

  // Filtre intelligent de recettes
  const filteredRecipes = recipes.filter((r) => {
    if (!searchTerm.trim()) return true;
    
    const normalizedSearch = normalizeText(searchTerm);
    const normalizedName = normalizeText(r.name);
    
    // Recherche par mots séparés (ex: "sauce nem" trouve "Sauce pour nems")
    const searchWords = normalizedSearch.split(/\s+/);
    return searchWords.every(word => normalizedName.includes(word));
  });

  const handleAddExistingRecipe = async () => {
    if (!selectedRecipe) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/meal-planner/meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          dayOfWeek: day,
          timeSlot,
          mealType,
          recipeId: selectedRecipe.id,
          portionsUsed: portionsDesired,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Erreur serveur:", errorData);
        alert(`Erreur: ${errorData.error || "Erreur inconnue"}`);
        return;
      }

      // Recalculer la liste de courses après ajout
      await recalculateShoppingList(planId);
      
      // Rafraîchir les données APRÈS le recalcul
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("❌ Erreur:", error);
      alert("Erreur lors de l'ajout");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!generatePrompt.trim()) return;

    setIsLoading(true);
    try {
      console.log("🤖 Génération IA:", { planId, day, timeSlot, mealType, prompt: generatePrompt });

      const res = await fetch(`/api/meal-planner/generate-meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          dayOfWeek: day,
          timeSlot,
          mealType,
          prompt: generatePrompt,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Erreur serveur:", errorData);
        alert(`Erreur: ${errorData.error || "Erreur inconnue"}`);
        return;
      }

      const data = await res.json();
      console.log("✅ Recette générée:", data);

      // Recalculer la liste de courses après génération IA
      await recalculateShoppingList(planId);

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("❌ Erreur:", error);
      alert("Erreur lors de la génération: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedRecipe(null);
    setGeneratePrompt("");
    setSearchTerm("");
    setPortionsDesired(2);
  };

  const isMobile = useMediaQuery("(max-width: 768px)");

  const content = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="existing">Recettes Existantes</TabsTrigger>
        <TabsTrigger 
          value="generate" 
          disabled={session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER"}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Générer
          {session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER" && (
            <span className="text-xs text-amber-500 ml-1">⭐</span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="existing" className="space-y-4 mt-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Rechercher une recette..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Recipe List */}
        <div className="max-h-[50vh] lg:max-h-96 overflow-y-auto space-y-2 pr-1">
          {isFetchingRecipes ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
              <p className="text-sm text-stone-500">Chargement des recettes...</p>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <p className="text-sm">Aucune recette trouvée</p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <Card
                key={recipe.id}
                className={`p-3 cursor-pointer transition-all ${
                  selectedRecipe?.id === recipe.id
                    ? "border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "hover:border-emerald-300"
                }`}
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{recipe.name}</h4>
                    <p className="text-sm text-stone-500">
                      ⏱ {formatTime(recipe.preparationTime + recipe.cookingTime)} • 🍽 {recipe.servings} portions
                      {recipe.caloriesPerServing && ` • 🔥 ${recipe.caloriesPerServing} kcal`}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <Button
          onClick={handleAddExistingRecipe}
          disabled={!selectedRecipe || isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isLoading ? "Ajout en cours..." : "Ajouter cette recette"}
        </Button>
      </TabsContent>

      <TabsContent value="generate" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>Décrivez le repas que vous souhaitez</Label>
          <Input
            placeholder="Ex: Salade césar légère, Pâtes carbonara..."
            value={generatePrompt}
            onChange={(e) => setGeneratePrompt(e.target.value)}
          />
        </div>

        <Button
          onClick={handleGenerateRecipe}
          disabled={!generatePrompt.trim() || isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isLoading ? "Génération en cours..." : "Générer cette recette"}
        </Button>
      </TabsContent>
    </Tabs>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] p-0 overflow-y-auto rounded-t-3xl">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>
                Ajouter un repas
              </SheetTitle>
              <p className="text-sm text-stone-500 text-left">
                {slots.length > 1 ? `${slots.length} créneaux` : `${day} à ${timeSlot} (${mealType})`}
              </p>
            </SheetHeader>
            <div className="mt-4">
              {content}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Ajouter un repas{slots.length > 1 ? ` (${slots.length} créneaux)` : ` - ${day} à ${timeSlot} (${mealType})`}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}