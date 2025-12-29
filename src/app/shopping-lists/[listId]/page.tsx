"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRealtimeShoppingList } from "@/hooks/use-realtime-shopping-list";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { ArrowLeft, CalendarDays, Check, Loader2, Plus, ShoppingCart, Sparkles, Trash2, UserPlus, Users2 } from "lucide-react";
import Link from "next/link";
import { ShoppingListLoader } from "@/components/meal-planner/shopping-list-loader";
import { ContributorsDialog } from "@/components/shopping-lists/contributors-dialog";

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
  "Autres",
  "Fruits & Légumes",
  "Viandes & Poissons",
  "Produits Laitiers",
  "Pain & Boulangerie",
  "Épicerie",
  "Condiments & Sauces",
  "Surgelés",
  "Snacks & Sucré",
  "Boissons",
];

function getCategoryEmoji(category: string): string {
  return CATEGORIES[category]?.emoji || "📦";
}

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

interface ShoppingListData {
  id: number;
  name: string;
  weeklyMealPlanId: number | null;
  isOwner: boolean;
  canEdit: boolean;
  weeklyMealPlan: {
    id: number;
    name: string;
    meals: Array<{ ingredients: string[] }>;
  } | null;
}

export default function ShoppingListPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.listId as string;
  const { data: session, status } = useSession();

  const [listData, setListData] = useState<ShoppingListData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour l'optimisation AI
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);

  // État pour le dialog des contributeurs
  const [showContributors, setShowContributors] = useState(false);

  // États pour l'input global
  const [newItemName, setNewItemName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // États pour le drag and drop
  const [draggedItem, setDraggedItem] = useState<{ name: string; fromCategory: string } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // Charger les données de la liste
  useEffect(() => {
    async function fetchList() {
      if (!listId) return;

      try {
        const res = await fetch(`/api/shopping-lists/${listId}`);
        if (res.ok) {
          const data = await res.json();
          setListData(data);
        } else if (res.status === 404) {
          setError("Liste non trouvée");
        } else {
          const errorData = await res.json();
          setError(errorData.error || "Erreur de chargement");
        }
      } catch (err) {
        console.error("Erreur chargement liste:", err);
        setError("Erreur de chargement");
      } finally {
        setLoadingList(false);
      }
    }

    if (status === "authenticated") {
      fetchList();
    } else if (status === "unauthenticated") {
      router.push(`/auth/signin?callbackUrl=/shopping-lists/${listId}`);
    }
  }, [listId, status, router]);

  // Utiliser le hook realtime - avec planId si lié à un menu, sinon avec listId pour les listes indépendantes
  const hookOptions = listData?.weeklyMealPlanId 
    ? { planId: listData.weeklyMealPlanId }
    : { listId: listData ? parseInt(listId) : null };

  const {
    items: realtimeItems,
    removedItemKeys,
    toggleIngredient,
    addItem,
    removeItem,
    moveItem,
    isConnected,
  } = useRealtimeShoppingList(hookOptions);

  // PlanId pour l'optimisation (uniquement pour les listes liées à un menu)
  const planId = listData?.weeklyMealPlanId;

  // Fonction pour optimiser la liste avec ChatGPT (uniquement pour les listes liées à un menu)
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
        setError(errorData.error || 'Erreur lors de l\'optimisation');
        setIsOptimizing(false);
        return;
      }

      const data = await res.json();

      if (data.shoppingList) {
        // Les items temps réel seront automatiquement mis à jour via SSE
        // après que generate-shopping-list crée les ShoppingListItem en DB
        
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

  // Construire la liste de courses à partir des items temps réel (source unique de vérité)
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

    // Utiliser uniquement les items temps réel (ShoppingListItem de la DB)
    realtimeItems.forEach(item => {
      const category = item.category || categorizeIngredient(item.ingredientName);
      const itemKey = `${item.ingredientName}-${category}`;

      // Vérifier si supprimé
      if (removedItemKeys.has(itemKey)) return;

      if (!mergedList[category]) mergedList[category] = [];

      mergedList[category].push({
        name: item.ingredientName,
        isChecked: item.isChecked,
        isManuallyAdded: item.isManuallyAdded,
        checkedByUser: item.checkedByUser,
      });
    });

    return mergedList;
  }, [realtimeItems, removedItemKeys]);

  // Filtrer et trier les catégories - exclure les catégories vides
  const sortedCategories = Object.entries(displayList)
    .filter(([, items]) => items.length > 0) // Ne garder que les catégories avec des articles
    .sort(([a], [b]) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

  const totalItems = Object.values(displayList).reduce((acc, items) => acc + items.length, 0);
  const checkedCount = Object.values(displayList).reduce((acc, items) =>
    acc + items.filter(item => item.isChecked).length, 0
  );

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

    // Remettre le focus sur l'input après l'ajout
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
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

  if (status === "loading" || loadingList) {
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
          <Link href="/shopping-lists" className="mt-4 inline-block">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour aux listes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!listData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-stone-600">Liste non trouvée</p>
          <Link href="/shopping-lists" className="mt-4 inline-block">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour aux listes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-stone-900">
      {/* Header simplifié avec titre et indicateurs */}
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/shopping-lists" className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-stone-800/50 transition-colors">
              <ArrowLeft className="h-5 w-5 text-stone-600 dark:text-stone-400" />
            </Link>
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {listData.name}
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {checkedCount} / {totalItems} articles cochés
                {isConnected && <span className="ml-2 text-emerald-500">● En ligne</span>}
              </p>
            </div>
          </div>

          {/* Boutons actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bouton Voir le menu - uniquement si lié à un menu */}
            {listData.weeklyMealPlanId && (
              <Link href={`/meal-planner?plan=${listData.weeklyMealPlanId}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Voir le menu</span>
                </Button>
              </Link>
            )}

            {/* Bouton Gérer les accès */}
            {listData.isOwner && (
              <Button
                onClick={() => setShowContributors(true)}
                size="sm"
                variant="outline"
                className="gap-2 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
              >
                <Users2 className="h-4 w-4" />
                <span className="hidden sm:inline">Gérer les accès</span>
              </Button>
            )}

            {/* Bouton Optimiser */}
            {planId && (session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
              <Button
                onClick={() => setShowOptimizeDialog(true)}
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
                  ref={inputRef}
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
                  className={`overflow-hidden border-0 shadow-sm hover:shadow-md ${
                    dragOverCategory === category
                      ? 'ring-2 ring-emerald-500 ring-offset-2 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'bg-white dark:bg-stone-800/50'
                  }`}
                  onDragOver={(e) => handleDragOver(e, category)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, category)}
                >
                  {/* Header de catégorie avec background coloré */}
                  <div className={`px-4 py-3 border-b ${getCategoryHeaderColor(category)}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-stone-700 shadow-sm">
                        <span className="text-lg">{getCategoryEmoji(category)}</span>
                      </div>
                      <h3 className="font-semibold text-base text-stone-900 dark:text-stone-100 flex-1">
                        {category}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        {items.length}
                      </span>
                    </div>
                  </div>

                  {/* Liste des items */}
                  <div className="p-2.5">
                    <div className="space-y-1.5">
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
                              group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg 
                              cursor-grab active:cursor-grabbing
                              ${draggedItem?.name === item.name && draggedItem?.fromCategory === category
                                ? 'opacity-50 scale-95'
                                : ''
                              }
                              ${item.isChecked
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40'
                                : isManual
                                  ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                                  : 'bg-stone-50/50 dark:bg-stone-800/30 border border-stone-200/60 dark:border-stone-700/40 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm hover:bg-white dark:hover:bg-stone-800/50'
                              }
                            `}
                          >
                            <div className="flex-shrink-0">
                              <div className={`
                                w-5 h-5 rounded-md border-2 flex items-center justify-center
                                ${item.isChecked 
                                  ? 'bg-emerald-500 border-emerald-500' 
                                  : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                                }
                              `}>
                                {item.isChecked && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className={`
                                text-sm font-medium flex items-center gap-2 flex-wrap
                                ${item.isChecked
                                  ? "line-through text-stone-500 dark:text-stone-400"
                                  : isManual
                                    ? "text-blue-700 dark:text-blue-300"
                                    : "text-stone-700 dark:text-stone-200"
                                }
                              `}>
                                {item.name}
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
                                {item.checkedByUser && item.isChecked && (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <span className="inline-block w-1 h-1 rounded-full bg-emerald-500"></span>
                                    {item.checkedByUser.pseudo || item.checkedByUser.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bouton supprimer */}
                            <button
                              onClick={(e) => handleRemoveItem(e, item.name, category)}
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Dialog de gestion des contributeurs */}
      <ContributorsDialog
        open={showContributors}
        onOpenChange={setShowContributors}
        listId={parseInt(listId)}
        isOwner={listData.isOwner}
      />

      {/* Dialog de confirmation pour l'optimisation */}
      <AlertDialog open={showOptimizeDialog} onOpenChange={setShowOptimizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Optimiser la liste de courses
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
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
                handleOptimize();
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Optimiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}