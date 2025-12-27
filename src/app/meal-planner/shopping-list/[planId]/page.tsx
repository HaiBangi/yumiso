"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRealtimeShoppingList } from "@/hooks/use-realtime-shopping-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ShoppingCart, 
  Check, 
  Loader2, 
  Plus, 
  UserPlus, 
  Trash2,
  Wifi,
  WifiOff,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

// Catégories avec emojis
const CATEGORIES: Record<string, { emoji: string }> = {
  "Fruits & Légumes": { emoji: "🥕" },
  "Viandes & Poissons": { emoji: "🥩" },
  "Produits Laitiers": { emoji: "🧀" },
  "Pain & Boulangerie": { emoji: "🍞" },
  "Épicerie": { emoji: "🛒" },
  "Condiments & Sauces": { emoji: "🧂" },
  "Surgelés": { emoji: "🧊" },
  "Snacks & Sucré": { emoji: "🍪" },
  "Boissons": { emoji: "🥤" },
  "Autres": { emoji: "📦" },
};

const categoryOrder = [
  "Fruits & Légumes",
  "Viandes & Poissons", 
  "Produits Laitiers",
  "Pain & Boulangerie",
  "Épicerie",
  "Condiments & Sauces",
  "Surgelés",
  "Snacks & Sucré",
  "Boissons",
  "Autres"
];

function getCategoryEmoji(category: string): string {
  return CATEGORIES[category]?.emoji || "📦";
}

export default function ShoppingListPage() {
  const params = useParams();
  const planId = params.planId ? parseInt(params.planId as string) : null;
  const { data: session, status } = useSession();
  
  const [plan, setPlan] = useState<{ id: number; name: string } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les formulaires par catégorie
  const [categoryInputs, setCategoryInputs] = useState<Record<string, string>>({});
  const [categoryAddingState, setCategoryAddingState] = useState<Record<string, boolean>>({});

  const { 
    items: realtimeItems, 
    toggleIngredient, 
    addItem, 
    removeItem,
    isConnected, 
    isLoading: loadingItems 
  } = useRealtimeShoppingList(planId);

  // Charger les infos du plan
  useEffect(() => {
    async function fetchPlan() {
      if (!planId) return;
      
      try {
        const res = await fetch(`/api/meal-planner/${planId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.plan) {
            setPlan({ id: data.plan.id, name: data.plan.name });
          } else {
            setError("Plan non trouvé");
          }
        } else {
          const errorData = await res.json();
          setError(errorData.error || "Plan non trouvé");
        }
      } catch (err) {
        console.error("Erreur chargement plan:", err);
        setError("Erreur de chargement");
      } finally {
        setLoadingPlan(false);
      }
    }
    
    fetchPlan();
  }, [planId]);

  // Organiser les items par catégorie
  const itemsByCategory = realtimeItems.reduce((acc, item) => {
    const category = item.category || "Autres";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof realtimeItems>);

  // S'assurer que toutes les catégories sont présentes
  const displayList: Record<string, typeof realtimeItems> = {};
  categoryOrder.forEach(cat => {
    displayList[cat] = itemsByCategory[cat] || [];
  });

  const sortedCategories = Object.entries(displayList).sort(([a], [b]) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const totalItems = realtimeItems.length;
  const checkedCount = realtimeItems.filter(item => item.isChecked).length;

  const handleAddToCategory = async (category: string) => {
    const itemName = categoryInputs[category]?.trim();
    if (!itemName) return;
    
    setCategoryAddingState(prev => ({ ...prev, [category]: true }));
    
    const result = await addItem(itemName, category);
    
    if (result.success) {
      setCategoryInputs(prev => ({ ...prev, [category]: "" }));
    }
    
    setCategoryAddingState(prev => ({ ...prev, [category]: false }));
  };

  const handleRemoveItem = async (e: React.MouseEvent, itemName: string, category: string) => {
    e.stopPropagation();
    await removeItem(itemName, category);
  };

  if (status === "loading" || loadingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-stone-600 dark:text-stone-400">
            Veuillez vous connecter pour accéder à la liste de courses
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
          <Link href="/meal-planner" className="mt-4 inline-block">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour aux menus
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/meal-planner">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  {plan?.name || "Liste de courses"}
                </h1>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {checkedCount} / {totalItems} articles cochés
                </p>
              </div>
            </div>
            
            {/* Indicateur de connexion */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-stone-800 shadow border border-stone-200 dark:border-stone-700">
                {loadingItems ? (
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                ) : isConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Message si tout est coché */}
        {checkedCount === totalItems && totalItems > 0 && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
            <Check className="h-5 w-5" />
            <span className="font-semibold">Toutes les courses sont faites ! 🎉</span>
          </div>
        )}

        {/* Grille des catégories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedCategories.map(([category, items]) => (
            <Card 
              key={category} 
              className="p-4 transition-all duration-200"
            >
              <h3 className="font-semibold text-lg text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
                <span className="text-xl">{getCategoryEmoji(category)}</span>
                {category}
                <span className="text-xs text-stone-400 font-normal ml-auto">
                  {items.length > 0 && `(${items.length})`}
                </span>
              </h3>
              
              {/* Formulaire d'ajout par catégorie */}
              <div className="mb-3">
                <div className="flex gap-1.5 items-stretch">
                  <Input
                    type="text"
                    value={categoryInputs[category] || ""}
                    onChange={(e) => setCategoryInputs(prev => ({ ...prev, [category]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddToCategory(category);
                      }
                    }}
                    className="flex-1 text-xs px-2"
                    style={{ height: '28px', minHeight: '28px', maxHeight: '28px' }}
                    disabled={categoryAddingState[category]}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddToCategory(category)}
                    disabled={!categoryInputs[category]?.trim() || categoryAddingState[category]}
                    className="p-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                    style={{ height: '28px', width: '28px', minHeight: '28px', minWidth: '28px' }}
                  >
                    {categoryAddingState[category] ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                {items.map((item) => {
                  const isManual = item.isManuallyAdded;

                  return (
                    <div 
                      key={`${category}-${item.ingredientName}`}
                      onClick={() => toggleIngredient(item.ingredientName, category, item.isChecked)}
                      className={`
                        group relative flex items-center gap-2 px-3 py-2.5 rounded-lg 
                        cursor-pointer transition-all duration-200
                        ${item.isChecked 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' 
                          : isManual
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                            : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'
                        }
                        active:scale-[0.98]
                      `}
                    >
                      <div className="flex-shrink-0">
                        <Checkbox
                          checked={item.isChecked}
                          className="h-4 w-4 pointer-events-none data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`
                          text-sm font-medium transition-all flex items-center gap-1.5
                          ${item.isChecked
                            ? "line-through text-stone-400 dark:text-stone-500"
                            : isManual
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-stone-700 dark:text-stone-300"
                          }
                        `}>
                          {item.ingredientName}
                          {isManual && (
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
                                    <UserPlus className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Ajouté manuellement
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        
                        {item.checkedByUser && item.isChecked && (
                          <div className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {item.checkedByUser.pseudo || item.checkedByUser.name}
                          </div>
                        )}
                      </div>
                      
                      {/* Bouton supprimer */}
                      <button
                        onClick={(e) => handleRemoveItem(e, item.ingredientName, category)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                      </button>
                    </div>
                  );
                })}
                
                {/* Message si catégorie vide */}
                {items.length === 0 && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 italic py-2 text-center">
                    Aucun article
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
