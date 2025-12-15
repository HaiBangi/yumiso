"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";

interface ShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any;
  onUpdate?: () => void; // Callback pour recharger les données après sauvegarde
  canOptimize?: boolean; // Seuls les contributeurs peuvent optimiser
}

export function ShoppingListDialog({ open, onOpenChange, plan, onUpdate, canOptimize = false }: ShoppingListDialogProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiShoppingList, setAiShoppingList] = useState<Record<string, string[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger la liste optimisée quand le plan change
  useEffect(() => {
    console.log('🔄 Dialog opened/plan changed, plan ID:', plan?.id, 'has optimized:', !!plan?.optimizedShoppingList);
    
    if (plan?.optimizedShoppingList) {
      try {
        const parsed = typeof plan.optimizedShoppingList === 'string' 
          ? JSON.parse(plan.optimizedShoppingList) 
          : plan.optimizedShoppingList;
        console.log('📋 Chargement liste optimisée pour plan', plan.id, ':', parsed);
        setAiShoppingList(parsed);
      } catch (e) {
        console.error('❌ Erreur parsing optimizedShoppingList:', e);
        setAiShoppingList(null);
      }
    } else {
      console.log('🔄 Pas de liste optimisée pour plan', plan?.id, ', réinitialisation à null');
      setAiShoppingList(null);
    }
  }, [plan?.id, plan?.optimizedShoppingList]);

  // Calculer la liste de courses consolidée
  const shoppingList = useMemo(() => {
    console.log('🛒 Calcul de la liste de courses pour le plan', plan?.id, 'avec', plan?.meals?.length, 'repas');
    if (!plan?.meals) return {};

    const consolidated: Record<string, string[]> = {
      "Légumes": [],
      "Viandes & Poissons": [],
      "Produits Laitiers": [],
      "Épicerie": [],
      "Condiments & Sauces": [],
      "Autres": [],
    };

    // ...existing code...
    const ingredientMap: Map<string, number> = new Map();

    plan.meals.forEach((meal: any) => {
      if (Array.isArray(meal.ingredients)) {
        meal.ingredients.forEach((ing: any) => {
          // Convertir en string
          const ingredientStr = typeof ing === 'string' ? ing : (ing?.name || String(ing));
          if (!ingredientStr || ingredientStr === 'undefined' || ingredientStr === 'null' || ingredientStr === '[object Object]') return;
          
          const current = ingredientMap.get(ingredientStr) || 0;
          ingredientMap.set(ingredientStr, current + 1);
        });
      }
    });

    // Catégoriser les ingrédients (simple heuristique)
    ingredientMap.forEach((count, ingredient) => {
      // Convertir en string et s'assurer que c'est valide
      const ingredientStr = typeof ingredient === 'string' ? ingredient : String(ingredient);
      if (!ingredientStr || ingredientStr === 'undefined' || ingredientStr === 'null') return;
      
      const lowerIng = ingredientStr.toLowerCase();
      
      // Détection de catégorie par mots-clés
      if (lowerIng.match(/(tomate|carotte|oignon|ail|poivron|salade|laitue|chou|légume|courgette|aubergine)/)) {
        consolidated["Légumes"].push(ingredientStr);
      } else if (lowerIng.match(/(viande|poulet|boeuf|porc|poisson|crevette|saumon|thon)/)) {
        consolidated["Viandes & Poissons"].push(ingredientStr);
      } else if (lowerIng.match(/(lait|fromage|yaourt|crème|beurre|œuf|oeuf)/)) {
        consolidated["Produits Laitiers"].push(ingredientStr);
      } else if (lowerIng.match(/(sauce|huile|vinaigre|moutarde|soja|nuoc mam|ketchup)/)) {
        consolidated["Condiments & Sauces"].push(ingredientStr);
      } else if (lowerIng.match(/(farine|sucre|sel|poivre|riz|pâtes|pain)/)) {
        consolidated["Épicerie"].push(ingredientStr);
      } else {
        consolidated["Autres"].push(ingredientStr);
      }
    });

    // Nettoyer les catégories vides
    Object.keys(consolidated).forEach(category => {
      if (consolidated[category].length === 0) {
        delete consolidated[category];
      }
    });

    return consolidated;
  }, [plan]);

  const toggleItem = (item: string) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    setCheckedItems(newSet);
  };

  const generateAIShoppingList = async () => {
    setIsGeneratingAI(true);
    setError(null);
    try {
      const res = await fetch('/api/meal-planner/generate-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('❌ Erreur API:', errorData);
        throw new Error(
          `Erreur ${res.status}: ${errorData.message || errorData.error}\n\n` +
          `Détails: ${errorData.details || 'Aucun détail disponible'}\n\n` +
          `Timestamp: ${errorData.timestamp || new Date().toISOString()}`
        );
      }

      const data = await res.json();
      const optimizedList = data.shoppingList;
      
      // Mettre à jour l'état local
      setAiShoppingList(optimizedList);

      // Sauvegarder automatiquement la liste optimisée
      try {
        const saveRes = await fetch('/api/meal-planner/save-shopping-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            planId: plan.id,
            optimizedList: optimizedList
          }),
        });

        if (!saveRes.ok) {
          console.error('⚠️ Erreur lors de la sauvegarde, mais la liste a été générée');
        } else {
          console.log('✅ Liste de courses optimisée sauvegardée');
          // Recharger les données du parent pour avoir la liste à jour
          if (onUpdate) {
            onUpdate();
          }
        }
      } catch (saveError) {
        console.error('⚠️ Erreur lors de la sauvegarde:', saveError);
        // Ne pas bloquer l'utilisateur si la sauvegarde échoue
      }
    } catch (error) {
      console.error('❌ Erreur complète:', error);
      setError(
        `Erreur lors de la génération de la liste de courses:\n\n${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const displayList = aiShoppingList || shoppingList;
  const totalItems = Object.values(displayList).reduce((acc, items) => acc + items.length, 0);
  const checkedCount = checkedItems.size;

  console.log('📊 Affichage:', {
    planId: plan?.id,
    hasAiList: !!aiShoppingList,
    hasShoppingList: !!shoppingList,
    displayingAI: !!aiShoppingList,
    totalItems
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        size="full"
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 pr-10">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-emerald-600" />
                Liste de Courses - {plan?.name}
              </DialogTitle>
              <p className="text-sm text-stone-500 mt-1">
                {checkedCount} / {totalItems} articles cochés
              </p>
            </div>
            {canOptimize && (
              <Button
                onClick={generateAIShoppingList}
                disabled={isGeneratingAI}
                size="sm"
                variant="outline"
                className="gap-2 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600 flex-shrink-0"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Optimisation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Optimiser avec IA</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

        {/* Grid layout - colonnes sur desktop, liste sur mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {Object.entries(displayList).map(([category, items]) => (
            <Card key={category} className="p-4">
              <h3 className="font-semibold text-lg text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
                <span className="text-xl">
                  {category === "Légumes" && "🥬"}
                  {category === "Viandes & Poissons" && "🥩"}
                  {category === "Produits Laitiers" && "🥛"}
                  {category === "Épicerie" && "🌾"}
                  {category === "Condiments & Sauces" && "🧂"}
                  {category === "Autres" && "📦"}
                </span>
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded transition-colors">
                    <Checkbox
                      id={`${category}-${idx}`}
                      checked={checkedItems.has(item)}
                      onCheckedChange={() => toggleItem(item)}
                    />
                    <label
                      htmlFor={`${category}-${idx}`}
                      className={`flex-1 cursor-pointer select-none ${
                        checkedItems.has(item)
                          ? "line-through text-stone-400"
                          : "text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      {item}
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {checkedCount === totalItems && totalItems > 0 && (
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
            <Check className="h-5 w-5" />
            <span className="font-semibold">Toutes les courses sont faites ! 🎉</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
