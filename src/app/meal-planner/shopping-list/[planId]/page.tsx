"use client";

import { useEffect, useState, useMemo } from "react";
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
  ArrowLeft,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { ShoppingListLoader } from "@/components/meal-planner/shopping-list-loader";

// Catégories avec emojis et mots-clés
const CATEGORIES: Record<string, { emoji: string; keywords: string[] }> = {
  "Fruits & Légumes": { 
    emoji: "🥕",
    keywords: ["tomate", "carotte", "oignon", "ail", "poivron", "salade", "laitue", "chou", 
      "courgette", "aubergine", "épinard", "brocoli", "pomme", "poire", "banane", "orange", 
      "citron", "fraise", "avocat", "champignon", "pomme de terre", "patate", "légume", "fruit"]
  },
  "Viandes & Poissons": { 
    emoji: "🥩",
    keywords: ["viande", "boeuf", "veau", "porc", "agneau", "poulet", "dinde", "canard",
      "steak", "escalope", "filet", "jambon", "lard", "bacon", "saucisse", "poisson", 
      "saumon", "thon", "cabillaud", "crevette", "gambas"]
  },
  "Produits Laitiers": { 
    emoji: "🧀",
    keywords: ["lait", "fromage", "yaourt", "crème", "beurre", "mascarpone", "mozzarella",
      "parmesan", "gruyère", "camembert", "oeuf", "œuf", "oeufs", "œufs"]
  },
  "Pain & Boulangerie": { 
    emoji: "🍞",
    keywords: ["pain", "baguette", "brioche", "croissant", "toast", "tortilla", "pita"]
  },
  "Épicerie": { 
    emoji: "🛒",
    keywords: ["pâtes", "riz", "semoule", "quinoa", "lentilles", "farine", "sucre", "sel",
      "levure", "maïzena", "céréales", "conserve", "boîte"]
  },
  "Condiments & Sauces": { 
    emoji: "🧂",
    keywords: ["sauce", "huile", "vinaigre", "moutarde", "ketchup", "mayonnaise", "soja",
      "curry", "paprika", "cumin", "thym", "basilic", "persil", "poivre"]
  },
  "Surgelés": { 
    emoji: "🧊",
    keywords: ["surgelé", "congelé", "glacé", "glace"]
  },
  "Snacks & Sucré": { 
    emoji: "🍪",
    keywords: ["biscuit", "gâteau", "chocolat", "bonbon", "chips", "nutella", "confiture", "miel"]
  },
  "Boissons": { 
    emoji: "🥤",
    keywords: ["eau", "jus", "soda", "coca", "thé", "café", "vin", "bière"]
  },
  "Autres": { 
    emoji: "📦",
    keywords: []
  },
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

function categorizeIngredient(ingredientName: string): string {
  const lowerName = ingredientName.toLowerCase();
  
  for (const [category, config] of Object.entries(CATEGORIES)) {
    if (category === "Autres") continue;
    
    for (const keyword of config.keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return "Autres";
}

interface PlanData {
  id: number;
  name: string;
  meals: Array<{
    ingredients: string[];
  }>;
  shoppingList?: Record<string, string[]>;
  optimizedShoppingList?: Record<string, string[]>;
}

export default function ShoppingListPage() {
  const params = useParams();
  const planId = params.planId ? parseInt(params.planId as string) : null;
  const { data: session, status } = useSession();
  
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour l'optimisation AI
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedList, setOptimizedList] = useState<Record<string, string[]> | null>(null);
  
  // États pour les formulaires par catégorie
  const [categoryInputs, setCategoryInputs] = useState<Record<string, string>>({});
  const [categoryAddingState, setCategoryAddingState] = useState<Record<string, boolean>>({});
  
  // États pour l'input global
  const [newItemName, setNewItemName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  // États pour le drag and drop
  const [draggedItem, setDraggedItem] = useState<{ name: string; fromCategory: string } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const { 
    items: realtimeItems,
    removedItemKeys,
    toggleIngredient, 
    addItem, 
    removeItem,
    moveItem,
    isConnected, 
    isLoading: loadingItems 
  } = useRealtimeShoppingList(planId);

  // Charger les infos du plan avec les repas
  useEffect(() => {
    async function fetchPlan() {
      if (!planId) return;
      
      try {
        const res = await fetch(`/api/meal-planner/${planId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.plan) {
            setPlan(data.plan);
            // Charger la liste optimisée si elle existe
            if (data.plan.optimizedShoppingList) {
              const parsed = typeof data.plan.optimizedShoppingList === 'string'
                ? JSON.parse(data.plan.optimizedShoppingList)
                : data.plan.optimizedShoppingList;
              setOptimizedList(parsed);
            }
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

  // Fonction pour optimiser la liste avec ChatGPT
  const handleOptimize = async () => {
    if (!planId || isOptimizing) return;
    
    setIsOptimizing(true);
    setError(null);
    
    try {
      const res = await fetch('/api/meal-planner/generate-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de l\'optimisation');
      }

      const data = await res.json();
      
      if (data.shoppingList) {
        // Mettre à jour l'état local
        setOptimizedList(data.shoppingList);
        
        // Mettre à jour aussi le plan pour que displayList soit recalculé
        setPlan(prev => prev ? {
          ...prev,
          optimizedShoppingList: data.shoppingList
        } : null);
        
        // Sauvegarder la liste optimisée
        try {
          await fetch('/api/meal-planner/save-shopping-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              planId,
              optimizedList: data.shoppingList
            }),
          });
        } catch {
          // Erreur silencieuse pour la sauvegarde
        }
        
        // Log des stats si disponibles
        if (data.stats) {
          console.log(`📊 Optimisation: ${data.stats.originalCount} → ${data.stats.optimizedCount} articles`);
        }
      }
    } catch (err) {
      console.error('Erreur optimisation:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'optimisation');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Construire la liste de courses à partir des recettes et des items temps réel
  const displayList = useMemo(() => {
    // Initialiser toutes les catégories
    const mergedList: Record<string, Array<{
      name: string;
      isChecked: boolean;
      isManuallyAdded: boolean;
      checkedByUser: { pseudo: string; name: string | null } | null;
    }>> = {};
    
    categoryOrder.forEach(cat => {
      mergedList[cat] = [];
    });

    // Set pour tracker les items déjà ajoutés (en lowercase pour éviter les doublons)
    const addedItems = new Set<string>();
    
    // Map pour récupérer l'état et la catégorie des items temps réel
    // La clé est le nom de l'ingrédient en lowercase
    const realtimeItemsMap = new Map<string, typeof realtimeItems[0]>();
    realtimeItems.forEach(item => {
      realtimeItemsMap.set(item.ingredientName.toLowerCase(), item);
    });
    
    // Set des items temps réel déjà traités (pour éviter les doublons)
    const processedRealtimeItems = new Set<string>();

    // Déterminer la source des items: liste optimisée ou repas
    const useOptimizedList = plan?.optimizedShoppingList || optimizedList;
    
    if (useOptimizedList) {
      // Utiliser la liste optimisée
      const optimized = typeof useOptimizedList === 'string' 
        ? JSON.parse(useOptimizedList) 
        : useOptimizedList;
      
      Object.entries(optimized).forEach(([category, items]) => {
        if (!Array.isArray(items)) return;
        if (!mergedList[category]) mergedList[category] = [];
        
        items.forEach(item => {
          const itemStr = String(item);
          const itemLower = itemStr.toLowerCase();
          
          // Vérifier si cet item a été déplacé vers une autre catégorie via realtime
          const realtimeItem = realtimeItemsMap.get(itemLower);
          
          // Si l'item existe en temps réel avec une catégorie DIFFÉRENTE, on le skip ici
          // Il sera ajouté dans sa nouvelle catégorie plus tard
          if (realtimeItem && realtimeItem.category !== category) {
            processedRealtimeItems.add(itemLower);
            return; // Skip - sera ajouté dans sa nouvelle catégorie
          }
          
          const itemKey = `${itemStr}-${category}`;
          
          // Vérifier si supprimé
          if (removedItemKeys.has(itemKey)) return;
          
          // Éviter les doublons (insensible à la casse)
          if (addedItems.has(itemLower)) return;
          
          mergedList[category].push({
            name: itemStr,
            isChecked: realtimeItem?.isChecked || false,
            isManuallyAdded: realtimeItem?.isManuallyAdded || false,
            checkedByUser: realtimeItem?.checkedByUser || null,
          });
          addedItems.add(itemLower);
          if (realtimeItem) processedRealtimeItems.add(itemLower);
        });
      });
    } else {
      // Pas de liste optimisée, utiliser les ingrédients des repas
      if (plan?.meals) {
        plan.meals.forEach(meal => {
          if (Array.isArray(meal.ingredients)) {
            meal.ingredients.forEach(ing => {
              const ingredientStr = typeof ing === 'string' ? ing : String(ing);
              if (!ingredientStr || ingredientStr === 'undefined' || ingredientStr === 'null') return;
              
              const itemLower = ingredientStr.toLowerCase();
              const category = categorizeIngredient(ingredientStr);
              
              // Vérifier si cet item a été déplacé vers une autre catégorie via realtime
              const realtimeItem = realtimeItemsMap.get(itemLower);
              if (realtimeItem && realtimeItem.category !== category) {
                processedRealtimeItems.add(itemLower);
                return; // Skip - sera ajouté dans sa nouvelle catégorie
              }
              
              const itemKey = `${ingredientStr}-${category}`;
              
              // Vérifier si supprimé
              if (removedItemKeys.has(itemKey)) return;
              
              // Éviter les doublons
              if (addedItems.has(itemLower)) return;
              
              if (!mergedList[category]) mergedList[category] = [];
              
              mergedList[category].push({
                name: ingredientStr,
                isChecked: realtimeItem?.isChecked || false,
                isManuallyAdded: realtimeItem?.isManuallyAdded || false,
                checkedByUser: realtimeItem?.checkedByUser || null,
              });
              addedItems.add(itemLower);
              if (realtimeItem) processedRealtimeItems.add(itemLower);
            });
          }
        });
      }
    }
    
    // Ajouter les items temps réel (y compris ceux déplacés vers une nouvelle catégorie)
    realtimeItems.forEach(item => {
      const itemLower = item.ingredientName.toLowerCase();
      const category = item.category || categorizeIngredient(item.ingredientName);
      const itemKey = `${item.ingredientName}-${category}`;
      
      // Vérifier si supprimé
      if (removedItemKeys.has(itemKey)) return;
      
      // Éviter les doublons
      if (addedItems.has(itemLower)) return;
      
      if (!mergedList[category]) mergedList[category] = [];
      
      mergedList[category].push({
        name: item.ingredientName,
        isChecked: item.isChecked,
        isManuallyAdded: item.isManuallyAdded,
        checkedByUser: item.checkedByUser,
      });
      addedItems.add(itemLower);
    });

    return mergedList;
  }, [plan, optimizedList, realtimeItems, removedItemKeys]);

  const sortedCategories = Object.entries(displayList).sort(([a], [b]) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const totalItems = Object.values(displayList).reduce((acc, items) => acc + items.length, 0);
  const checkedCount = Object.values(displayList).reduce((acc, items) => 
    acc + items.filter(item => item.isChecked).length, 0
  );

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

  const handleToggleItem = (itemName: string, category: string, isChecked: boolean) => {
    toggleIngredient(itemName, category, isChecked);
  };
  
  // Handler pour l'ajout global
  const handleAddGlobalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    setIsAddingItem(true);
    
    // Catégoriser automatiquement l'article
    const category = categorizeIngredient(newItemName.trim());
    const result = await addItem(newItemName.trim(), category);
    
    if (result.success) {
      setNewItemName("");
    }
    
    setIsAddingItem(false);
  };
  
  // Fonctions de drag and drop
  const handleDragStart = (e: React.DragEvent, itemName: string, fromCategory: string) => {
    setDraggedItem({ name: itemName, fromCategory });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemName);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverCategory(null);
  };

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategory !== category) {
      setDragOverCategory(category);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = async (e: React.DragEvent, toCategory: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem.fromCategory !== toCategory) {
      await moveItem(draggedItem.name, draggedItem.fromCategory, toCategory);
    }
    setDraggedItem(null);
    setDragOverCategory(null);
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
      {/* Header simplifié avec titre et indicateurs */}
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {plan?.name || "Liste de courses"}
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {checkedCount} / {totalItems} articles cochés
              </p>
            </div>
          </div>
          
          {/* Boutons actions */}
          <div className="flex items-center gap-3">
            {/* Bouton Optimiser */}
            {(session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing}
                size="sm"
                variant="outline"
                className="gap-2 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
              >
                {isOptimizing ? (
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
            )}
            
            {/* Indicateur de connexion */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
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

      {/* Contenu */}
      <main className="mx-auto max-w-screen-2xl px-4 py-2 sm:px-6 md:px-8">
        {/* Loader pendant l'optimisation */}
        {isOptimizing ? (
          <ShoppingListLoader itemCount={totalItems} />
        ) : (
          <>
            {/* Formulaire d'ajout global */}
            <div className="mb-2">
              <form onSubmit={handleAddGlobalItem} className="flex gap-2 items-stretch">
                <Input
                  type="text"
                  placeholder="Ajouter un article..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 text-sm py-0 bg-white dark:bg-stone-800"
                  style={{ height: '36px', minHeight: '36px', maxHeight: '36px' }}
                  disabled={isAddingItem}
                />
                <Button
                  type="submit"
                  disabled={!newItemName.trim() || isAddingItem}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                  style={{ height: '36px', minHeight: '36px', maxHeight: '36px' }}
                >
                  {isAddingItem ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Ajouter</span>
                </Button>
              </form>
            </div>
            
            {/* Message si tout est coché */}
            {checkedCount === totalItems && totalItems > 0 && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
                <Check className="h-5 w-5" />
                <span className="font-semibold">Toutes les courses sont faites ! 🎉</span>
              </div>
            )}

            {/* Grille des catégories - Plus large sur PC */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {sortedCategories.map(([category, items]) => (
                <Card 
                  key={category} 
                  className={`p-4 lg:p-5 transition-all duration-200 ${
                    dragOverCategory === category 
                      ? 'ring-2 ring-emerald-500 ring-offset-2 bg-emerald-50 dark:bg-emerald-900/20' 
                      : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, category)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, category)}
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
                      key={`${category}-${item.name}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.name, category)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleToggleItem(item.name, category, item.isChecked)}
                      className={`
                        group relative flex items-center gap-2 px-3 py-2.5 rounded-lg 
                        cursor-grab active:cursor-grabbing transition-all duration-200
                        ${draggedItem?.name === item.name && draggedItem?.fromCategory === category
                          ? 'opacity-50 scale-95'
                          : ''
                        }
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
                          {item.name}
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
                        onClick={(e) => handleRemoveItem(e, item.name, category)}
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
        </>
        )}
      </main>
    </div>
  );
}
