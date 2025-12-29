"use client";

import { useState, useMemo, useRef } from "react";
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
  TooltipContent,
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
import { Input } from "@/components/ui/input";
import { ShoppingCart, Check, Sparkles, Loader2, X, Plus, UserPlus, Trash2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ShoppingListLoader } from "./shopping-list-loader";

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

// Obtenir la couleur du header pour chaque catégorie
function getCategoryHeaderColor(category: string): string {
  const colors: Record<string, string> = {
    "Fruits & Légumes": "bg-green-100/90 dark:bg-green-900/30 border-green-200 dark:border-green-800/40",
    "Viandes & Poissons": "bg-red-100/90 dark:bg-red-900/30 border-red-200 dark:border-red-800/40",
    "Produits Laitiers": "bg-yellow-100/90 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800/40",
    "Pain & Boulangerie": "bg-orange-100/90 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/40",
    "Épicerie": "bg-amber-100/90 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/40",
    "Condiments & Sauces": "bg-purple-100/90 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/40",
    "Surgelés": "bg-cyan-100/90 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800/40",
    "Snacks & Sucré": "bg-pink-100/90 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800/40",
    "Boissons": "bg-blue-100/90 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/40",
    "Autres": "bg-stone-100/90 dark:bg-stone-800/30 border-stone-200 dark:border-stone-700/40",
  };
  return colors[category] || "bg-stone-100/90 dark:bg-stone-800/30 border-stone-200 dark:border-stone-700/40";
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
  
  // États pour l'ajout d'article
  const [newItemName, setNewItemName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // États pour le drag and drop
  const [draggedItem, setDraggedItem] = useState<{ name: string; fromCategory: string } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  
  // Articles supprimés localement (pour ceux qui ne sont pas en base)
  const [removedItems, setRemovedItems] = useState<Set<string>>(new Set());

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

  // Note: optimizedShoppingList n'est plus utilisé car ShoppingListItem est la source unique de vérité
  // Les items temps réel sont synchronisés via SSE

  const shoppingList = useMemo(() => {
    if (!plan?.meals) return {};

    const consolidated: Record<string, string[]> = {};
    // Initialiser toutes les catégories
    Object.keys(CATEGORIES).forEach(cat => {
      consolidated[cat] = [];
    });

    // Map pour dédupliquer par clé lowercase, mais garder le premier nom trouvé
    const ingredientMap: Map<string, string> = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plan.meals.forEach((meal: any) => {
      if (Array.isArray(meal.ingredients)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meal.ingredients.forEach((ing: any) => {
          const ingredientStr = typeof ing === 'string' ? ing : (ing?.name || String(ing));
          if (!ingredientStr || ingredientStr === 'undefined' || ingredientStr === 'null' || ingredientStr === '[object Object]') return;
          
          // Utiliser lowercase comme clé pour dédupliquer
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
    // Combiner les items supprimés localement et ceux du hook temps réel
    const allRemovedItems = new Set([...removedItems, ...realtimeRemovedItemKeys]);
    
    // Initialiser TOUTES les catégories (même vides)
    const mergedList: Record<string, string[]> = {};
    Object.keys(CATEGORIES).forEach(cat => {
      mergedList[cat] = [];
    });
    
    // PRIORITÉ: Utiliser les items temps réel (ShoppingListItem de la DB) s'ils existent
    // C'est la source unique de vérité
    if (realtimeItems && realtimeItems.length > 0) {
      realtimeItems.forEach((item) => {
        const category = item.category || categorizeIngredient(item.ingredientName);
        
        // Vérifier si l'item a été supprimé
        const itemKey = `${item.ingredientName}-${category}`;
        if (allRemovedItems.has(itemKey)) return;
        
        if (!mergedList[category]) {
          mergedList[category] = [];
        }
        
        mergedList[category].push(item.ingredientName);
      });
      
      return mergedList;
    }
    
    // FALLBACK: Si pas d'items temps réel, utiliser les ingrédients des repas
    Object.entries(shoppingList).forEach(([category, items]) => {
      if (!mergedList[category]) {
        mergedList[category] = [];
      }
      
      (items as string[]).forEach((item: string) => {
        const itemKey = `${item}-${category}`;
        if (allRemovedItems.has(itemKey)) return;
        
        mergedList[category].push(item);
      });
    });

    return mergedList;
  }, [shoppingList, realtimeItems, removedItems, realtimeRemovedItemKeys]);

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

  const handleDrop = async (e: React.DragEvent, toCategory: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem.fromCategory !== toCategory) {
      // Utiliser l'API temps réel pour déplacer l'item (préserve isManuallyAdded)
      if (realtimeMoveItem) {
        await realtimeMoveItem(draggedItem.name, draggedItem.fromCategory, toCategory);
      }
    }
    setDraggedItem(null);
    setDragOverCategory(null);
  };

  // Fonction pour supprimer un article
  const handleRemoveItem = async (e: React.MouseEvent, itemName: string, category: string) => {
    e.stopPropagation(); // Éviter de déclencher le toggle
    
    // Ajouter immédiatement à la liste des supprimés (optimistic UI)
    const itemKey = `${itemName}-${category}`;
    setRemovedItems(prev => new Set([...prev, itemKey]));
    
    // Appeler l'API si disponible
    if (realtimeRemoveItem) {
      const result = await realtimeRemoveItem(itemName, category);
      if (!result.success) {
        // Rollback en cas d'erreur
        setRemovedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      }
    }
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
      
      // Les ShoppingListItem sont maintenant créés directement par generate-shopping-list
      // et seront automatiquement synchronisés via SSE (temps réel)
      
      // Log des stats si disponibles
      if (data.stats) {
        console.log(`📊 Optimisation: ${data.stats.originalCount} → ${data.stats.optimizedCount} articles`);
      }
      
      // Appeler onUpdate pour rafraîchir les données du parent si nécessaire
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
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
  
  // Calculer le nombre d'items cochés en utilisant les realtimeItems pour leur état
  const checkedCount = useMemo(() => {
    if (!realtimeItems || realtimeItems.length === 0) {
      return checkedItems.size;
    }
    
    // Créer un Set des items cochés en temps réel
    const checkedSet = new Set<string>();
    realtimeItems.forEach(item => {
      if (item.isChecked) {
        checkedSet.add(item.ingredientName.toLowerCase());
      }
    });
    
    // Compter combien d'items dans displayList sont cochés
    let count = 0;
    Object.values(displayList).forEach(items => {
      items.forEach(itemName => {
        if (checkedSet.has(itemName.toLowerCase())) {
          count++;
        }
      });
    });
    
    return count;
  }, [displayList, realtimeItems, checkedItems.size]);

  // Ordre des catégories pour l'affichage
  const categoryOrder = [
    "Autres",
    "Fruits & Légumes",
    "Viandes & Poissons", 
    "Produits Laitiers",
    "Pain & Boulangerie",
    "Épicerie",
    "Condiments & Sauces",
    "Surgelés",
    "Snacks & Sucré",
    "Boissons"
  ];

  // Trier et filtrer les catégories - exclure les catégories vides
  const sortedCategories = Object.entries(displayList)
    .filter(([, items]) => items.length > 0) // Ne garder que les catégories avec des articles
    .sort(([a], [b]) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

  // Contenu de la liste de courses (inline pour éviter la perte de focus)
  const shoppingListContent = (
    <>
      {/* Loader pendant l'optimisation */}
      {isGeneratingAI ? (
        <ShoppingListLoader itemCount={totalItems} />
      ) : (
        <>
          {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

          {/* Formulaire d'ajout d'article */}
          {realtimeAddItem && (
            <div className="mb-2 mx-4 md:mx-0">
              <form onSubmit={handleAddItem} className="flex gap-2 items-stretch">
                <Input
                  ref={inputRef}
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
          {addItemError && (
            <p className="text-sm text-red-500 mt-1">{addItemError}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0 pb-6 md:pb-0">
        {sortedCategories.map(([category, items]) => (
          <Card 
            key={category} 
            className={`overflow-hidden border-0 shadow-sm hover:shadow-md ${
              dragOverCategory === category 
                ? 'ring-2 ring-emerald-500 ring-offset-2 bg-emerald-50/50 dark:bg-emerald-950/20' 
                : 'bg-white dark:bg-stone-800/50'
            }`}
            onDragOver={(e) => handleDragOver(e, category)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, category)}
          >
            {/* Header de catégorie avec background coloré */}
            <div className={`px-3 py-2 border-b ${getCategoryHeaderColor(category)}`}>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white dark:bg-stone-700 shadow-sm">
                  <span className="text-sm">{getCategoryEmoji(category)}</span>
                </div>
                <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex-1">
                  {category}
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-stone-700/80 text-xs font-medium text-stone-700 dark:text-stone-300">
                  {items.length}
                </span>
              </div>
            </div>
            
            {/* Liste des items */}
            <div className="p-3">
            <div className="space-y-1.5">
              {items.map((item, idx) => {
                // Vérifier si l'item est coché en temps réel
                const realtimeItem = realtimeItems?.find(
                  (i) => i.ingredientName === item && (i.category === category || categorizeIngredient(i.ingredientName) === category)
                );
                const isItemChecked = realtimeItem?.isChecked || checkedItems.has(item);
                const checkedBy = realtimeItem?.checkedByUser;
                // Utiliser isManuallyAdded depuis la base de données
                const isManual = realtimeItem?.isManuallyAdded || false;
                const isDragging = draggedItem?.name === item;

                return (
                  <div 
                    key={`${category}-${item}-${idx}`} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, category)}
                    onDragEnd={handleDragEnd}
                    onClick={() => toggleItem(item, category)}
                    className={`
                      group relative flex items-center gap-2.5 px-3 py-2 rounded-lg 
                      cursor-grab active:cursor-grabbing
                      ${isDragging ? 'opacity-50 scale-95' : ''}
                      ${isItemChecked 
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40' 
                        : isManual
                          ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                          : 'bg-stone-50/50 dark:bg-stone-800/30 border border-stone-200/60 dark:border-stone-700/40 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm hover:bg-white dark:hover:bg-stone-800/50'
                      }
                    `}
                  >
                    <div className="flex-shrink-0 flex items-center">
                      <div className={`
                        w-4.5 h-4.5 rounded border-2 flex items-center justify-center
                        ${isItemChecked 
                          ? 'bg-emerald-500 border-emerald-500' 
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                        }
                      `}>
                        {isItemChecked && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className={`
                        text-sm font-medium flex items-center gap-1.5
                        ${isItemChecked
                          ? "line-through text-stone-500 dark:text-stone-400"
                          : isManual
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-stone-700 dark:text-stone-200"
                        }
                      `}>
                        {item}
                        {isManual && (
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/60 flex-shrink-0">
                                  <UserPlus className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Ajouté manuellement
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {/* Nom de l'utilisateur qui a coché - juste après le texte */}
                        {checkedBy && isItemChecked && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 ml-1">
                            <span className="inline-block w-1 h-1 rounded-full bg-emerald-500"></span>
                            {checkedBy.pseudo || checkedBy.name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Bouton supprimer */}
                    {realtimeRemoveItem && (
                      <button
                        onClick={(e) => handleRemoveItem(e, item, category)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                      </button>
                    )}
                  </div>
                );
              })}
              </div>
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
      )}
    </>
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
                {/* Bouton ouvrir en pleine page */}
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

      {/* Dialog de confirmation pour l'optimisation */}
      <AlertDialog open={showOptimizeDialog} onOpenChange={setShowOptimizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Optimiser la liste de courses
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
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
        
        {/* Bouton fermer uniquement */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 flex items-center justify-center h-8 w-8 rounded-full bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-stone-800 transition-colors border border-stone-200 dark:border-stone-700"
          aria-label="Fermer"
        >
          <X className="h-4 w-4 text-stone-700 dark:text-stone-200" />
        </button>
        
        <div className="bg-emerald-50 dark:bg-stone-900 rounded-t-3xl px-4 pt-6 pb-2 border-b border-stone-200 dark:border-stone-700">
          {/* Titre avec icône */}
          <div className="flex items-start gap-3 pr-10">
            <ShoppingCart className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 line-clamp-2 break-words">
                {plan?.name}
              </h2>
            </div>
          </div>
          
          {/* Ligne avec compteur et boutons */}
          <div className="flex items-center justify-between mt-2 ml-9">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {checkedCount} / {totalItems} articles cochés
            </p>
            <div className="flex items-center gap-2">
              {/* Bouton Optimiser */}
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
              
              {/* Bouton ouvrir en pleine page */}
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

    {/* Dialog de confirmation pour l'optimisation */}
    <AlertDialog open={showOptimizeDialog} onOpenChange={setShowOptimizeDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Optimiser la liste de courses
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
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
    </>
  );
}