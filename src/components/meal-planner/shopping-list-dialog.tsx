"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Sparkles, Loader2, X, ExternalLink } from "lucide-react";
import { ErrorAlert } from "@/components/ui/error-alert";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ShoppingListLoader } from "./shopping-list-loader";
import {
  ShoppingListContent,
  ShoppingItem,
  CATEGORIES,
  CATEGORY_ORDER,
  categorizeIngredient
} from "@/components/shopping-lists/shopping-list-content";

interface ShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
  onUpdate?: () => void;
  canOptimize?: boolean;
  // Temps réel
  realtimeToggle?: (ingredientName: string, category: string, currentState: boolean) => void;
  realtimeItems?: Array<{
    id: number;
    ingredientName: string;
    category: string;
    isChecked: boolean;
    isManuallyAdded: boolean;
    checkedByUser: { pseudo: string; name: string | null } | null;
  }>;
  realtimeRemovedItemKeys?: Set<string>;
  realtimeAddItem?: (ingredientName: string, category?: string) => Promise<{ success: boolean; error?: string }>;
  realtimeRemoveItem?: (ingredientName: string, category: string) => Promise<{ success: boolean; error?: string }>;
  realtimeMoveItem?: (ingredientName: string, fromCategory: string, toCategory: string) => Promise<{ success: boolean; error?: string }>;
}

export function ShoppingListDialog({
  open,
  onOpenChange,
  plan,
  onUpdate,
  canOptimize = false,
  realtimeToggle,
  realtimeItems = [],
  realtimeRemovedItemKeys = new Set(),
  realtimeAddItem,
  realtimeRemoveItem,
  realtimeMoveItem,
}: ShoppingListDialogProps) {
  const { data: session } = useSession();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Articles supprimés localement (pour ceux qui ne sont pas en base)
  const [removedItems, setRemovedItems] = useState<Set<string>>(new Set());

  // Construire la liste statique à partir des repas (fallback)
  const shoppingList = useMemo(() => {
    if (!plan?.meals) return {};

    const consolidated: Record<string, string[]> = {};
    Object.keys(CATEGORIES).forEach(cat => {
      consolidated[cat] = [];
    });

    const ingredientMap: Map<string, string> = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plan.meals.forEach((meal: any) => {
      if (Array.isArray(meal.ingredients)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meal.ingredients.forEach((ing: any) => {
          const ingredientStr = typeof ing === 'string' ? ing : (ing?.name || String(ing));
          if (!ingredientStr || ingredientStr === 'undefined' || ingredientStr === 'null' || ingredientStr === '[object Object]') return;

          const key = ingredientStr.toLowerCase();
          if (!ingredientMap.has(key)) {
            ingredientMap.set(key, ingredientStr);
          }
        });
      }
    });

    ingredientMap.forEach((ingredientStr) => {
      if (!ingredientStr || ingredientStr === 'undefined' || ingredientStr === 'null') return;
      const category = categorizeIngredient(ingredientStr);
      consolidated[category].push(ingredientStr);
    });

    Object.keys(consolidated).forEach(category => {
      if (consolidated[category].length === 0) {
        delete consolidated[category];
      }
    });

    return consolidated;
  }, [plan]);

  // Construire displayList au format ShoppingItem pour le composant commun
  const displayList = useMemo(() => {
    const allRemovedItems = new Set([...removedItems, ...realtimeRemovedItemKeys]);
    const mergedList: Record<string, ShoppingItem[]> = {};

    CATEGORY_ORDER.forEach(cat => {
      mergedList[cat] = [];
    });

    // PRIORITÉ: Utiliser les items temps réel (ShoppingListItem de la DB) s'ils existent
    if (realtimeItems && realtimeItems.length > 0) {
      realtimeItems.forEach((item) => {
        const category = item.category || categorizeIngredient(item.ingredientName);
        const itemKey = `${item.id}`; // Utiliser l'ID comme clé
        if (allRemovedItems.has(itemKey)) return;

        if (!mergedList[category]) mergedList[category] = [];

        mergedList[category].push({
          id: item.id, // ✅ AJOUTER L'ID !
          name: item.ingredientName,
          isChecked: item.isChecked,
          isManuallyAdded: item.isManuallyAdded,
          checkedByUser: item.checkedByUser,
        });
      });

      return mergedList;
    }

    // FALLBACK: Si pas d'items temps réel, utiliser les ingrédients des repas
    Object.entries(shoppingList).forEach(([category, items]) => {
      if (!mergedList[category]) mergedList[category] = [];

      (items as string[]).forEach((item: string, index: number) => {
        const itemKey = `${item}-${category}`;
        if (allRemovedItems.has(itemKey)) return;

        mergedList[category].push({
          id: Date.now() + index, // ID temporaire pour le fallback
          name: item,
          isChecked: checkedItems.has(item),
          isManuallyAdded: false,
          checkedByUser: null,
        });
      });
    });

    return mergedList;
  }, [shoppingList, realtimeItems, removedItems, realtimeRemovedItemKeys, checkedItems]);

  // Handlers pour ShoppingListContent
  const handleToggleItem = (itemName: string, category: string, isChecked: boolean) => {
    if (realtimeToggle && realtimeItems) {
      realtimeToggle(itemName, category, isChecked);
    } else {
      const newSet = new Set(checkedItems);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      setCheckedItems(newSet);
    }
  };

  const handleAddItem = async (itemName: string, category: string) => {
    if (!realtimeAddItem) return { success: false, error: "Fonction non disponible" };
    return await realtimeAddItem(itemName, category);
  };

  const handleRemoveItem = async (itemName: string, category: string) => {
    const itemKey = `${itemName}-${category}`;
    setRemovedItems(prev => new Set([...prev, itemKey]));

    if (realtimeRemoveItem) {
      const result = await realtimeRemoveItem(itemName, category);
      if (!result.success) {
        setRemovedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      }
      return result;
    }
    return { success: true };
  };

  const handleMoveItem = async (itemName: string, fromCategory: string, toCategory: string) => {
    if (!realtimeMoveItem) return { success: false, error: "Fonction non disponible" };
    return await realtimeMoveItem(itemName, fromCategory, toCategory);
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
        throw new Error(
          `Erreur ${res.status}: ${errorData.message || errorData.error}\n\n` +
          `Détails: ${errorData.details || 'Aucun détail disponible'}\n\n` +
          `Timestamp: ${errorData.timestamp || new Date().toISOString()}`
        );
      }

      const data = await res.json();

      if (data.stats) {
        console.log(`📊 Optimisation: ${data.stats.originalCount} → ${data.stats.optimizedCount} articles`);
      }

      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError(
        `Erreur lors de la génération de la liste de courses:\n\n${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const totalItems = Object.values(displayList).reduce((acc, items) => acc + items.length, 0);
  const checkedCount = Object.values(displayList).reduce((acc, items) =>
    acc + items.filter(item => item.isChecked).length, 0
  );

  // Contenu de la liste de courses
  const shoppingListContent = (
    <>
      {isGeneratingAI ? (
        <ShoppingListLoader itemCount={totalItems} />
      ) : (
        <>
          {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

          <div className="px-4 md:px-0">
            <ShoppingListContent
              items={displayList}
              onToggleItem={handleToggleItem}
              onAddItem={realtimeAddItem ? handleAddItem : undefined}
              onRemoveItem={realtimeRemoveItem ? handleRemoveItem : undefined}
              onMoveItem={realtimeMoveItem ? handleMoveItem : undefined}
              showAddForm={!!realtimeAddItem}
              gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-6 md:pb-0"
            />
          </div>

          {checkedCount === totalItems && totalItems > 0 && (
            <div className="mt-4 mx-4 md:mx-0 md:mt-6 p-3 md:p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center gap-2 md:gap-3 text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4 md:h-5 md:w-5" />
              <span className="font-semibold text-sm md:text-base">Toutes les courses sont faites ! 🎉</span>
            </div>
          )}
        </>
      )}
    </>
  );

  // Dialog de confirmation pour l'optimisation (commun aux deux modes)
  const optimizeDialog = (
    <AlertDialog open={showOptimizeDialog} onOpenChange={setShowOptimizeDialog}>
      <AlertDialogContent>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Optimiser la liste de courses
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                L&apos;optimisation utilise l&apos;intelligence artificielle pour améliorer votre liste de courses :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Regroupement des ingrédients similaires</li>
                <li>Fusion des quantités (ex: 2 oignons + 1 oignon = 3 oignons)</li>
                <li>Catégorisation automatique par rayon</li>
                <li>Suppression des doublons</li>
              </ul>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Cette action va recréer la liste. Les articles cochés seront décochés.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowOptimizeDialog(false);
              generateAIShoppingList();
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Optimiser
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isDesktop) {
    return (
      <>
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
                  <DialogDescription className="text-sm text-stone-500 mt-1">
                    {checkedCount} / {totalItems} articles cochés
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => window.open(`/meal-planner/shopping-list/${plan?.id}`, '_blank')}
                          size="sm"
                          variant="outline"
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="hidden sm:inline">Aller sur la page de courses</span>
                        </Button>
                      </TooltipTrigger>
                    </Tooltip>
                  </TooltipProvider>

                  {canOptimize && (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => setShowOptimizeDialog(true)}
                            disabled={isGeneratingAI || (session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER")}
                            size="sm"
                            variant="outline"
                            className="gap-2 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
                          >
                            {isGeneratingAI ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="hidden sm:inline">Optimisation...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                <span className="hidden sm:inline">Optimiser</span>
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </DialogHeader>

            {shoppingListContent}
          </DialogContent>
        </Dialog>

        {optimizeDialog}
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] p-0 overflow-y-auto rounded-t-3xl">
          <VisuallyHidden>
            <SheetTitle>Liste de courses</SheetTitle>
          </VisuallyHidden>

          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-50 flex items-center justify-center h-8 w-8 rounded-full bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-stone-800 transition-colors border border-stone-200 dark:border-stone-700"
            aria-label="Fermer"
          >
            <X className="h-4 w-4 text-stone-700 dark:text-stone-200" />
          </button>

          <div className="bg-emerald-50 dark:bg-stone-900 rounded-t-3xl px-4 pt-6 pb-2 border-b border-stone-200 dark:border-stone-700">
            <div className="flex items-start gap-3 pr-10">
              <ShoppingCart className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 line-clamp-2 break-words">
                  {plan?.name}
                </h2>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 ml-9">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {checkedCount} / {totalItems} articles cochés
              </p>
              <div className="flex items-center gap-2">
                {canOptimize && (session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
                  <button
                    onClick={() => setShowOptimizeDialog(true)}
                    disabled={isGeneratingAI}
                    className="flex items-center justify-center h-7 w-7 rounded-full bg-white dark:bg-stone-800 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700 disabled:opacity-50"
                    aria-label="Optimiser la liste"
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
                    )}
                  </button>
                )}

                <button
                  onClick={() => window.open(`/meal-planner/shopping-list/${plan?.id}`, '_blank')}
                  className="flex items-center justify-center h-7 w-7 rounded-full bg-white dark:bg-stone-800 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700"
                  aria-label="Ouvrir en pleine page"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
                </button>
              </div>
            </div>
          </div>

          <div>
            {shoppingListContent}
          </div>
        </SheetContent>
      </Sheet>

      {optimizeDialog}
    </>
  );
}
