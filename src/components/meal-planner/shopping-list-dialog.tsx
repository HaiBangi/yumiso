"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Check, Sparkles, Loader2, X, Plus, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// Catégories avec emojis et mots-clés pour le classement automatique
const CATEGORIES = {
  "Fruits & Légumes": {
    emoji: "🥕",
    keywords: [
      // Légumes
      "tomate", "carotte", "oignon", "ail", "poivron", "salade", "laitue", "chou", 
      "courgette", "aubergine", "épinard", "brocoli", "chou-fleur", "haricot vert",
      "petit pois", "asperge", "artichaut", "betterave", "céleri", "concombre",
      "cornichon", "courge", "endive", "fenouil", "navet", "poireau", "radis",
      "champignon", "pomme de terre", "patate", "échalote", "gingembre", "avocat",
      // Fruits
      "pomme", "poire", "banane", "orange", "citron", "fraise", "framboise", 
      "myrtille", "cerise", "pêche", "abricot", "prune", "raisin", "melon",
      "pastèque", "ananas", "mangue", "kiwi", "clémentine", "mandarine", "pamplemousse",
      "fruit", "légume"
    ]
  },
  "Viandes & Poissons": {
    emoji: "🥩",
    keywords: [
      // Viandes
      "viande", "boeuf", "veau", "porc", "agneau", "mouton", "poulet", "dinde",
      "canard", "lapin", "steak", "côte", "escalope", "filet", "rôti", "gigot",
      "jambon", "lard", "bacon", "saucisse", "merguez", "chipolata", "boudin",
      "pâté", "terrine", "foie", "andouillette",
      // Poissons & fruits de mer
      "poisson", "saumon", "thon", "cabillaud", "colin", "merlu", "sole", "bar",
      "loup", "dorade", "sardine", "maquereau", "truite", "hareng", "anchois",
      "crevette", "gambas", "langoustine", "homard", "crabe", "moule", "huître",
      "saint-jacques", "coquillage", "calamars", "poulpe", "seiche"
    ]
  },
  "Produits Laitiers": {
    emoji: "🧀",
    keywords: [
      "lait", "fromage", "yaourt", "yogourt", "crème", "beurre", "margarine",
      "crème fraîche", "mascarpone", "ricotta", "mozzarella", "parmesan",
      "gruyère", "emmental", "comté", "camembert", "brie", "roquefort", "chèvre",
      "feta", "cheddar", "raclette", "reblochon", "petit-suisse", "faisselle",
      "fromage blanc", "kéfir", "laitier",
      "oeuf", "œuf", "oeufs", "œufs"
    ]
  },
  "Pain & Boulangerie": {
    emoji: "🍞",
    keywords: [
      "pain", "baguette", "brioche", "croissant", "pain de mie", "toast",
      "focaccia", "ciabatta", "pain complet", "pain aux céréales", "pain de seigle",
      "viennoiserie", "chausson", "pain au chocolat", "chocolatine", "muffin",
      "bagel", "wrap", "tortilla", "naan", "pita", "boulangerie"
    ]
  },
  "Épicerie": {
    emoji: "🛒",
    keywords: [
      // Féculents
      "pâtes", "riz", "semoule", "quinoa", "boulgour", "couscous", "lentilles",
      "pois chiche", "haricot sec", "fève", "nouilles", "vermicelles", "lasagne",
      "spaghetti", "tagliatelles", "penne", "fusilli", "macaroni", "ravioli",
      // Conserves
      "conserve", "boîte", "tomate pelée", "concentré", "maïs", "petits pois",
      "haricots", "thon en boîte", "sardine en boîte", "cornichon",
      // Épicerie sèche
      "farine", "sucre", "sel", "levure", "bicarbonate", "maïzena", "fécule",
      "chapelure", "flocons", "céréales", "muesli", "avoine", "sésame", "graines",
      "noix", "amande", "noisette", "cacahuète", "pistache", "noix de cajou",
      "raisin sec", "pruneau", "abricot sec", "datte", "figue",
      // Sauces et assaisonnements de base
      "bouillon", "cube", "fond", "épice"
    ]
  },
  "Condiments & Sauces": {
    emoji: "🧂",
    keywords: [
      "sauce", "huile", "vinaigre", "moutarde", "ketchup", "mayonnaise",
      "sauce soja", "nuoc mam", "sauce tomate", "pesto", "tapenade", "aïoli",
      "sauce barbecue", "sauce worcestershire", "tabasco", "sriracha", "harissa",
      "curry", "paprika", "cumin", "coriandre", "thym", "romarin", "basilic",
      "persil", "ciboulette", "estragon", "laurier", "origan", "herbes de provence",
      "poivre", "sel fin", "fleur de sel", "gros sel", "sauce piquante",
      "vinaigrette", "assaisonnement", "condiment"
    ]
  },
  "Surgelés": {
    emoji: "🧊",
    keywords: [
      "surgelé", "congelé", "glacé", "glace", "sorbet", "crème glacée",
      "légumes surgelés", "frites", "poisson pané", "nuggets", "cordon bleu",
      "pizza surgelée", "plat surgelé", "bûche glacée"
    ]
  },
  "Snacks & Sucré": {
    emoji: "🍪",
    keywords: [
      "biscuit", "gâteau", "cookie", "chocolat", "bonbon", "confiserie",
      "chips", "crackers", "bretzel", "pop-corn", "cacahuètes salées",
      "barre chocolatée", "nutella", "pâte à tartiner", "confiture", "miel",
      "sirop", "compote", "dessert", "flan", "crème dessert", "mousse",
      "tarte", "éclair", "chou", "macaron", "meringue", "snack", "sucré", "sucrerie"
    ]
  },
  "Boissons": {
    emoji: "🥤",
    keywords: [
      "eau", "jus", "soda", "coca", "limonade", "orangina", "sprite", "fanta",
      "thé", "café", "tisane", "infusion", "chocolat chaud", "sirop",
      "vin", "bière", "cidre", "champagne", "apéritif", "alcool", "whisky",
      "vodka", "rhum", "gin", "pastis", "liqueur", "digestif",
      "lait d'amande", "lait de soja", "lait d'avoine", "boisson", "bouteille"
    ]
  },
  "Autres": {
    emoji: "📦",
    keywords: []
  }
};

// Fonction pour catégoriser un ingrédient
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

// Obtenir l'emoji d'une catégorie
function getCategoryEmoji(category: string): string {
  return CATEGORIES[category as keyof typeof CATEGORIES]?.emoji || "📦";
}

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
    checkedByUser: { pseudo: string; name: string | null } | null;
  }>;
  realtimeAddItem?: (ingredientName: string, category?: string) => Promise<{ success: boolean; error?: string }>;
}

export function ShoppingListDialog({ 
  open, 
  onOpenChange, 
  plan, 
  onUpdate, 
  canOptimize = false,
  realtimeToggle,
  realtimeItems = [],
  realtimeAddItem,
}: ShoppingListDialogProps) {
  const { data: session } = useSession();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiShoppingList, setAiShoppingList] = useState<Record<string, string[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // États pour l'ajout d'article
  const [newItemName, setNewItemName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // États pour le drag and drop
  const [draggedItem, setDraggedItem] = useState<{ name: string; fromCategory: string } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [manualCategoryOverrides, setManualCategoryOverrides] = useState<Record<string, string>>({});

  // Fonction pour ajouter un article
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !realtimeAddItem) return;
    
    setIsAddingItem(true);
    setAddItemError(null);
    
    // Catégoriser automatiquement l'article
    const category = categorizeIngredient(newItemName.trim());
    const result = await realtimeAddItem(newItemName.trim(), category);
    
    if (result.success) {
      setNewItemName("");
    } else {
      setAddItemError(result.error || "Erreur lors de l'ajout");
    }
    
    setIsAddingItem(false);
    
    // Remettre le focus sur l'input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

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

  // Collecter les ingrédients des recettes (pour savoir lesquels sont manuels)
  const recipeIngredients = useMemo(() => {
    const ingredients = new Set<string>();
    if (!plan?.meals) return ingredients;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plan.meals.forEach((meal: any) => {
      if (Array.isArray(meal.ingredients)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meal.ingredients.forEach((ing: any) => {
          const ingredientStr = typeof ing === 'string' ? ing : (ing?.name || String(ing));
          if (ingredientStr && ingredientStr !== 'undefined' && ingredientStr !== 'null') {
            ingredients.add(ingredientStr.toLowerCase());
          }
        });
      }
    });
    
    return ingredients;
  }, [plan]);

  const shoppingList = useMemo(() => {
    console.log('🛒 Calcul de la liste de courses pour le plan', plan?.id, 'avec', plan?.meals?.length, 'repas');
    if (!plan?.meals) return {};

    const consolidated: Record<string, string[]> = {};
    // Initialiser toutes les catégories
    Object.keys(CATEGORIES).forEach(cat => {
      consolidated[cat] = [];
    });

    const ingredientMap: Map<string, number> = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plan.meals.forEach((meal: any) => {
      if (Array.isArray(meal.ingredients)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meal.ingredients.forEach((ing: any) => {
          const ingredientStr = typeof ing === 'string' ? ing : (ing?.name || String(ing));
          if (!ingredientStr || ingredientStr === 'undefined' || ingredientStr === 'null' || ingredientStr === '[object Object]') return;
          
          const current = ingredientMap.get(ingredientStr) || 0;
          ingredientMap.set(ingredientStr, current + 1);
        });
      }
    });

    ingredientMap.forEach((count, ingredient) => {
      const ingredientStr = typeof ingredient === 'string' ? ingredient : String(ingredient);
      if (!ingredientStr || ingredientStr === 'undefined' || ingredientStr === 'null') return;
      
      const category = categorizeIngredient(ingredientStr);
      consolidated[category].push(ingredientStr);
    });

    // Supprimer les catégories vides
    Object.keys(consolidated).forEach(category => {
      if (consolidated[category].length === 0) {
        delete consolidated[category];
      }
    });

    return consolidated;
  }, [plan]);

  // Fusionner la liste statique avec les items temps réel et les overrides manuels
  const displayList = useMemo(() => {
    const baseList = aiShoppingList || shoppingList;
    
    // Créer une copie de la liste de base
    const mergedList: Record<string, string[]> = {};
    Object.entries(baseList).forEach(([category, items]) => {
      mergedList[category] = [...items];
    });

    // Ajouter les items temps réel qui ne sont pas déjà dans la liste
    if (realtimeItems && realtimeItems.length > 0) {
      realtimeItems.forEach((item) => {
        let category = item.category;
        if (category === "Autres" || !category) {
          category = categorizeIngredient(item.ingredientName);
        }
        
        if (!mergedList[category]) {
          mergedList[category] = [];
        }
        if (!mergedList[category].includes(item.ingredientName)) {
          mergedList[category].push(item.ingredientName);
        }
      });
    }

    // Appliquer les overrides manuels de catégorie (drag and drop)
    if (Object.keys(manualCategoryOverrides).length > 0) {
      const finalList: Record<string, string[]> = {};
      
      // Initialiser toutes les catégories
      Object.keys(CATEGORIES).forEach(cat => {
        finalList[cat] = [];
      });
      
      // Répartir les items selon les overrides
      Object.entries(mergedList).forEach(([category, items]) => {
        items.forEach(item => {
          const effectiveCategory = manualCategoryOverrides[item] || category;
          if (!finalList[effectiveCategory]) {
            finalList[effectiveCategory] = [];
          }
          if (!finalList[effectiveCategory].includes(item)) {
            finalList[effectiveCategory].push(item);
          }
        });
      });
      
      // Supprimer les catégories vides
      Object.keys(finalList).forEach(category => {
        if (finalList[category].length === 0) {
          delete finalList[category];
        }
      });
      
      return finalList;
    }

    return mergedList;
  }, [aiShoppingList, shoppingList, realtimeItems, manualCategoryOverrides]);

  // Vérifier si un article est ajouté manuellement (pas dans les ingrédients des recettes)
  const isManualItem = (itemName: string): boolean => {
    // Un item est manuel s'il n'est PAS dans les ingrédients des recettes
    return !recipeIngredients.has(itemName.toLowerCase());
  };

  const toggleItem = (item: string, category: string = "Autres") => {
    // Si le temps réel est activé, utiliser la fonction temps réel
    if (realtimeToggle && realtimeItems) {
      const realtimeItem = realtimeItems.find(
        (i) => i.ingredientName === item && i.category === category
      );
      const currentState = realtimeItem?.isChecked || false;
      realtimeToggle(item, category, currentState);
    } else {
      // Sinon, utiliser le comportement local classique
      const newSet = new Set(checkedItems);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      setCheckedItems(newSet);
    }
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

  const handleDrop = (e: React.DragEvent, toCategory: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem.fromCategory !== toCategory) {
      // Sauvegarder le changement de catégorie
      setManualCategoryOverrides(prev => ({
        ...prev,
        [draggedItem.name]: toCategory
      }));
    }
    setDraggedItem(null);
    setDragOverCategory(null);
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
      
      setAiShoppingList(optimizedList);

      try {
        const saveRes = await fetch('/api/meal-planner/save-shopping-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            planId: plan.id,
            optimizedList: optimizedList
          }),
        });

        if (saveRes.ok && onUpdate) {
          onUpdate();
        }
      } catch {
        // Erreur lors de la sauvegarde silencieuse
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

  const totalItems = Object.values(displayList).reduce((acc, items) => acc + items.length, 0);
  const checkedCount = realtimeItems 
    ? realtimeItems.filter(item => item.isChecked).length 
    : checkedItems.size;

  // Ordre des catégories pour l'affichage
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

  // Trier les catégories selon l'ordre défini
  const sortedCategories = Object.entries(displayList).sort(([a], [b]) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  // Contenu de la liste de courses (inline pour éviter la perte de focus)
  const shoppingListContent = (
    <>
      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

      {/* Formulaire d'ajout d'article */}
      {realtimeAddItem && (
        <div className="mb-2 px-4 md:px-0">
          <form onSubmit={handleAddItem} className="flex gap-2 items-stretch">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Ajouter un article..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 text-sm py-0"
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
          {addItemError && (
            <p className="text-sm text-red-500 mt-1">{addItemError}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0 pb-6 md:pb-0">
        {sortedCategories.map(([category, items]) => (
          <Card 
            key={category} 
            className={`p-3 md:p-4 transition-all duration-200 ${
              dragOverCategory === category 
                ? 'ring-2 ring-emerald-500 ring-offset-2 bg-emerald-50/50 dark:bg-emerald-950/20' 
                : ''
            }`}
            onDragOver={(e) => handleDragOver(e, category)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, category)}
          >
            <h3 className="font-semibold text-base md:text-lg text-stone-900 dark:text-stone-100 mb-2 md:mb-3 flex items-center gap-2">
              <span className="text-lg md:text-xl">{getCategoryEmoji(category)}</span>
              {category}
            </h3>
            <div className="space-y-1.5 md:space-y-2">
              {items.map((item, idx) => {
                // Vérifier si l'item est coché en temps réel
                const realtimeItem = realtimeItems?.find(
                  (i) => i.ingredientName === item && (i.category === category || categorizeIngredient(i.ingredientName) === category)
                );
                const isItemChecked = realtimeItem?.isChecked || checkedItems.has(item);
                const checkedBy = realtimeItem?.checkedByUser;
                const isManual = isManualItem(item);
                const isDragging = draggedItem?.name === item;

                return (
                  <div 
                    key={`${category}-${item}-${idx}`} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, category)}
                    onDragEnd={handleDragEnd}
                    onClick={() => toggleItem(item, category)}
                    className={`
                      group relative flex items-center gap-3 px-3 py-2.5 rounded-lg 
                      cursor-grab active:cursor-grabbing transition-all duration-200
                      ${isDragging ? 'opacity-50 scale-95' : ''}
                      ${isItemChecked 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' 
                        : isManual
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                          : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'
                      }
                      active:scale-[0.98]
                    `}
                  >
                    <div className="flex-shrink-0 flex items-center">
                      <Checkbox
                        checked={isItemChecked}
                        className="h-5 w-5 pointer-events-none data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className={`
                        text-sm md:text-base font-medium transition-all flex items-center gap-1.5
                        ${isItemChecked
                          ? "line-through text-stone-400 dark:text-stone-500"
                          : isManual
                            ? "text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200"
                            : "text-stone-700 dark:text-stone-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400"
                        }
                      `}>
                        {item}
                        {isManual && (
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
                                  <UserPlus className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Ajouté manuellement
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      
                      {checkedBy && isItemChecked && (
                        <div className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {checkedBy.pseudo || checkedBy.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {checkedCount === totalItems && totalItems > 0 && (
        <div className="mt-4 mx-4 md:mx-0 md:mt-6 p-3 md:p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center gap-2 md:gap-3 text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4 md:h-5 md:w-5" />
          <span className="font-semibold text-sm md:text-base">Toutes les courses sont faites ! 🎉</span>
        </div>
      )}
    </>
  );

  if (isDesktop) {
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
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={generateAIShoppingList}
                        disabled={isGeneratingAI || (session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER")}
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
                            <span className="hidden sm:inline">Optimiser</span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs z-[100]">
                      <p>Regrouper, additionner et organiser intelligemment les ingrédients par catégories</p>
                      {session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER" && (
                        <p className="text-amber-400 mt-1">⭐ Fonctionnalité Premium</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </DialogHeader>

          {shoppingListContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
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
        
        <div className="sticky top-0 z-10 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 rounded-t-3xl px-4 pt-6 pb-3 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-start gap-3 mb-3">
            <ShoppingCart className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 line-clamp-2 break-words">
                {plan?.name}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                {checkedCount} / {totalItems} articles cochés
              </p>
            </div>
          </div>
          
          {canOptimize && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={generateAIShoppingList}
                    disabled={isGeneratingAI || (session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER")}
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Optimisation...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Optimiser
                        {session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER" && (
                          <span className="text-xs text-amber-500 ml-1">⭐ Premium</span>
                        )}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs z-[60]">
                  <p>Regrouper, additionner et organiser intelligemment les ingrédients par catégories</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="pt-4">
          {shoppingListContent}
        </div>
      </SheetContent>
    </Sheet>
  );
}