"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Plus, UserPlus, Trash2, ShoppingCart, Pencil, Loader2 } from "lucide-react";
import { AddItemForm } from "./AddItemForm";

// Catégories avec emojis et mots-clés pour le classement automatique
export const CATEGORIES: Record<string, { emoji: string; keywords: string[] }> = {
  "Viandes & Poissons": {
    // Mettre cette catégorie EN PREMIER pour que "bœuf" match avant "œuf"
    emoji: "🥩",
    keywords: [
      "viande", "boeuf", "bœuf", "veau", "porc", "agneau", "mouton", "poulet", "dinde",
      "canard", "lapin", "steak", "côte", "escalope", "filet", "rôti", "gigot",
      "jambon", "lard", "bacon", "saucisse", "merguez", "chipolata", "boudin",
      "pâté", "terrine", "foie", "andouillette",
      "poisson", "saumon", "thon", "cabillaud", "colin", "merlu", "sole", "bar",
      "loup", "dorade", "sardine", "maquereau", "truite", "hareng", "anchois",
      "crevette", "gambas", "langoustine", "homard", "crabe", "moule", "huître",
      "saint-jacques", "coquillage", "calamars", "poulpe", "seiche"
    ]
  },
  "Fruits & Légumes": {
    emoji: "🥕",
    keywords: [
      "tomate", "carotte", "oignon", "ail", "poivron", "salade", "laitue", "chou",
      "courgette", "aubergine", "épinard", "brocoli", "chou-fleur", "haricot vert",
      "petit pois", "asperge", "artichaut", "betterave", "céleri", "concombre",
      "cornichon", "courge", "endive", "fenouil", "navet", "poireau", "radis",
      "champignon", "pomme de terre", "patate", "échalote", "gingembre", "avocat",
      "pomme", "poire", "banane", "orange", "citron", "fraise", "framboise",
      "myrtille", "cerise", "pêche", "abricot", "prune", "raisin", "melon",
      "pastèque", "ananas", "mangue", "kiwi", "clémentine", "mandarine", "pamplemousse",
      "fruit", "légume"
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
      // Mettre œuf/oeuf EN DERNIER pour éviter de matcher "bœuf"
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
      "pâtes", "riz", "semoule", "quinoa", "boulgour", "couscous", "lentilles",
      "pois chiche", "haricot sec", "fève", "nouilles", "vermicelles", "lasagne",
      "spaghetti", "tagliatelles", "penne", "fusilli", "macaroni", "ravioli",
      "conserve", "boîte", "tomate pelée", "concentré", "maïs", "petits pois",
      "haricots", "thon en boîte", "sardine en boîte", "cornichon",
      "farine", "sucre", "sel", "levure", "bicarbonate", "maïzena", "fécule",
      "chapelure", "flocons", "céréales", "muesli", "avoine", "sésame", "graines",
      "noix", "amande", "noisette", "cacahuète", "pistache", "noix de cajou",
      "raisin sec", "pruneau", "abricot sec", "datte", "figue",
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

export const CATEGORY_ORDER = [
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

// Fonction pour catégoriser un ingrédient
export function categorizeIngredient(ingredientName: string): string {
  const lowerName = ingredientName.toLowerCase();

  // ===== GESTION DES EDGE CASES EN PRIORITÉ =====

  // 1. Sauces et huiles vont TOUJOURS dans "Condiments & Sauces"
  if (lowerName.includes("sauce") || lowerName.includes("huile")) {
    return "Condiments & Sauces";
  }

  // 2. Vinaigre et moutarde
  if (lowerName.includes("vinaigre") || lowerName.includes("moutarde")) {
    return "Condiments & Sauces";
  }

  // 3. Bouillon, cube, fond (ex: "bouillon de légumes", "cube de bouillon")
  if (lowerName.includes("bouillon") || lowerName.includes("cube") || lowerName.includes("fond de")) {
    return "Condiments & Sauces";
  }

  // 4. Épices et aromates séchés (mais pas herbes fraîches)
  if ((lowerName.includes("épice") || lowerName.includes("poudre") || lowerName.includes("moulu"))
      && !lowerName.includes("pomme de terre")) {
    return "Condiments & Sauces";
  }

  // 5. Pâte (tartiner, curry, etc.) - sauf "pâte feuilletée", "pâte brisée", "pâtes"
  if (lowerName.includes("pâte ") &&
      !lowerName.includes("pâtes") &&
      !lowerName.includes("feuilletée") &&
      !lowerName.includes("brisée") &&
      !lowerName.includes("sablée")) {
    return "Condiments & Sauces";
  }

  // 6. Lait de coco, crème de coco (pas produits laitiers)
  if (lowerName.includes("lait de coco") || lowerName.includes("crème de coco")) {
    return "Épicerie";
  }

  // 7. Farine, levure, bicarbonate
  if (lowerName.includes("farine") || lowerName.includes("levure") || lowerName.includes("bicarbonate")) {
    return "Épicerie";
  }

  // ===== CATÉGORISATION NORMALE (avec mots entiers pour éviter les faux positifs) =====
  for (const [category, config] of Object.entries(CATEGORIES)) {
    if (category === "Autres") continue;

    for (const keyword of config.keywords) {
      const keywordLower = keyword.toLowerCase();

      // Recherche avec frontières de mots pour éviter les faux positifs
      // Ex: "échine" ne doit pas matcher "hachée"
      const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

      if (regex.test(lowerName)) {
        return category;
      }
    }
  }

  return "Autres";
}

// Obtenir l'emoji d'une catégorie
export function getCategoryEmoji(category: string): string {
  return CATEGORIES[category]?.emoji || "📦";
}

// Obtenir la couleur du header pour chaque catégorie
export function getCategoryHeaderColor(category: string): string {
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

// Type pour un item de la liste
export interface ShoppingItem {
  id: number;
  name: string;
  isChecked: boolean;
  isManuallyAdded: boolean;
  checkedByUser: { pseudo: string; name: string | null } | null;
}

// Props du composant
export interface ShoppingListContentProps {
  // Données
  items: Record<string, ShoppingItem[]>;

  // Actions
  onToggleItem: (itemId: number, isChecked: boolean) => void;
  onAddItem?: (itemName: string, category: string, store?: string | null) => Promise<{ success: boolean; error?: string }>;
  onRemoveItem?: (itemId: number) => Promise<{ success: boolean; error?: string }>;
  onMoveItem?: (itemName: string, fromCategory: string, toCategory: string) => Promise<{ success: boolean; error?: string }>;
  onEditItem?: (itemId: number, newName: string, store?: string | null) => Promise<{ success: boolean; error?: string }>;
  onMoveItemToStore?: (itemId: number, newStore: string | null, newCategory?: string) => Promise<{ success: boolean; error?: string }>;

  // Options d'affichage
  showAddForm?: boolean;
  gridClassName?: string;
  accentColor?: "emerald" | "blue"; // emerald pour les listes liées à un menu, blue pour les indépendantes
  isLoading?: boolean; // Affiche un skeleton loader pendant le chargement
  newlyAddedIds?: Set<number>; // IDs des items nouvellement ajoutés pour l'effet visuel glow

  // Enseignes
  availableStores?: string[]; // Liste des enseignes disponibles pour l'autocomplete
  storeName?: string; // Nom de l'enseigne actuelle (pour le drag & drop)

  // Drag & drop global (géré par StoreGroupedShoppingList)
  draggedItemGlobal?: { itemId: number; itemName: string; fromStore: string; fromCategory: string } | null;
  onItemDragStart?: (itemId: number, itemName: string, fromCategory: string) => void; // Callback pour démarrer le drag
  onItemDragEnd?: () => void; // Callback pour terminer le drag
  onStoreDrop?: (toCategory: string) => void; // Callback pour drop dans cette enseigne
}

// Composant Skeleton pour le chargement
function ShoppingListSkeleton({ gridClassName }: { gridClassName: string }) {
  return (
    <div className={gridClassName}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-stone-800/50 rounded-lg overflow-hidden shadow-sm animate-pulse">
          {/* Header skeleton */}
          <div className="px-3 py-2 border-b bg-stone-100 dark:bg-stone-700/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-stone-200 dark:bg-stone-600" />
              <div className="h-4 bg-stone-200 dark:bg-stone-600 rounded w-24" />
              <div className="ml-auto h-4 w-8 bg-stone-200 dark:bg-stone-600 rounded-full" />
            </div>
          </div>
          {/* Items skeleton */}
          <div className="p-2 space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-800/30">
                <div className="w-5 h-5 rounded-md bg-stone-200 dark:bg-stone-600" />
                <div className="h-4 bg-stone-200 dark:bg-stone-600 rounded flex-1 max-w-[120px]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShoppingListContent({
  items,
  onToggleItem,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onEditItem,
  onMoveItemToStore,
  showAddForm = true,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6",
  accentColor = "emerald",
  isLoading = false,
  newlyAddedIds = new Set(),
  availableStores = [],
  storeName,
  draggedItemGlobal,
  onItemDragStart,
  onItemDragEnd,
  onStoreDrop,
}: ShoppingListContentProps) {
  // États pour le drag and drop
  const [draggedItem, setDraggedItem] = useState<{ id: number; name: string; fromCategory: string; fromStore?: string } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // État pour l'édition inline d'un item
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Trier et filtrer les catégories
  const sortedCategories = Object.entries(items)
    .filter(([, categoryItems]) => categoryItems.length > 0)
    .sort(([a], [b]) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

  // Vérifier si la liste est vide
  const isEmptyList = sortedCategories.length === 0;

  // Handler pour démarrer l'édition inline
  const handleStartEdit = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    setEditingValue(item.name);
  };

  // Handler pour sauvegarder l'édition inline
  const handleSaveInlineEdit = async () => {
    if (!onEditItem || editingItemId === null || isSaving) return;

    const trimmedValue = editingValue.trim();
    if (!trimmedValue) {
      // Si vide, annuler l'édition
      setEditingItemId(null);
      setEditingValue("");
      return;
    }

    setIsSaving(true);

    const result = await onEditItem(editingItemId, trimmedValue);

    setIsSaving(false);

    if (result.success) {
      setEditingItemId(null);
      setEditingValue("");
    }
  };

  // Handler pour annuler l'édition
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingValue("");
  };

  // Handler pour les touches clavier dans l'input d'édition
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveInlineEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // Fonctions de drag and drop
  const handleDragStart = (e: React.DragEvent, itemId: number, itemName: string, fromCategory: string) => {
    setDraggedItem({ id: itemId, name: itemName, fromCategory, fromStore: storeName });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemName);

    // Appeler le callback parent pour le drag entre enseignes si disponible
    if (onItemDragStart) {
      onItemDragStart(itemId, itemName, fromCategory);
    }
  };

  const handleDragEnd = () => {
    console.log('[handleDragEnd] 🏁 Nettoyage de l\'état de drag');
    setDraggedItem(null);
    setDragOverCategory(null);

    // Appeler le callback parent
    if (onItemDragEnd) {
      onItemDragEnd();
    }
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
    e.stopPropagation(); // Empêcher la propagation vers StoreGroupedShoppingList
    console.log('[handleDrop] 🎯 Drop détecté dans catégorie:', toCategory);

    // Utiliser draggedItemGlobal (partagé entre toutes les enseignes) ou draggedItem local
    const itemToDrop = draggedItemGlobal || draggedItem;

    if (!itemToDrop) {
      console.log('[handleDrop] ⚠️ Pas d\'item dragué');
      setDraggedItem(null);
      setDragOverCategory(null);
      return;
    }

    // Normaliser les propriétés (draggedItemGlobal a itemId/itemName, draggedItem local a id/name)
    const itemId = 'itemId' in itemToDrop ? itemToDrop.itemId : itemToDrop.id;
    const itemName = 'itemName' in itemToDrop ? itemToDrop.itemName : itemToDrop.name;
    const { fromCategory, fromStore } = itemToDrop;

    console.log('[handleDrop] 📦 Item dragué:', { itemId, itemName, fromCategory, fromStore });
    console.log('[handleDrop] 🏪 Enseigne actuelle (storeName):', storeName);

    // Nettoyer TOUJOURS l'état local au début pour éviter les items "fantômes"
    setDraggedItem(null);
    setDragOverCategory(null);

    // Cas 1: Drag entre enseignes (avec possibilité de changement de catégorie)
    if (fromStore && fromStore !== storeName && onStoreDrop) {
      console.log('[handleDrop] 🔄 Drag entre enseignes détecté!');
      console.log('[handleDrop] ➡️ De:', fromStore, '/', fromCategory);
      console.log('[handleDrop] ➡️ Vers:', storeName, '/', toCategory);

      // Appeler le handler parent qui gère le changement d'enseigne + catégorie
      onStoreDrop(toCategory);
    }
    // Cas 2: Drag dans la même enseigne, changement de catégorie seulement
    else if (fromCategory !== toCategory && onMoveItem) {
      console.log('[handleDrop] 📂 Drag intra-enseigne:', fromCategory, '→', toCategory);
      await onMoveItem(itemName, fromCategory, toCategory);
    } else {
      console.log('[handleDrop] ⏭️ Aucune action (même catégorie et même enseigne)');
    }
  };

  // Handler pour supprimer un article
  const handleRemoveItem = async (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation();
    if (onRemoveItem) {
      await onRemoveItem(itemId);
    }
  };

  return (
    <>
      {/* Formulaire d'ajout d'article - composant mémorisé pour éviter les re-renders */}
      {showAddForm && onAddItem && (
        <AddItemForm onAddItem={onAddItem} availableStores={availableStores} />
      )}

      {/* Skeleton loader pendant le chargement */}
      {isLoading && (
        <ShoppingListSkeleton gridClassName={gridClassName} />
      )}

      {/* État vide - inciter à ajouter des articles (uniquement si pas en chargement) */}
      {isEmptyList && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 ${
            accentColor === "blue"
              ? "bg-blue-100 dark:bg-blue-900/30"
              : "bg-emerald-100 dark:bg-emerald-900/30"
          }`}>
            <ShoppingCart className={`h-8 w-8 sm:h-10 sm:w-10 ${
              accentColor === "blue"
                ? "text-blue-600 dark:text-blue-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`} />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-stone-800 dark:text-stone-200 mb-2 text-center">
            Votre liste est vide
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center max-w-xs mb-4">
            Commencez par ajouter votre premier article dans le champ ci-dessus
          </p>
          {onAddItem && (
            <Button
              variant="outline"
              className={`${
                accentColor === "blue"
                  ? "border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                  : "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
              }`}
              onClick={() => {
                // Focus sur l'input d'ajout
                const input = document.querySelector('input[placeholder="Ajouter un article..."]') as HTMLInputElement;
                input?.focus();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un article
            </Button>
          )}
        </div>
      )}

      {/* Grille des catégories */}
      {!isEmptyList && !isLoading && (
        <div className={gridClassName}>
          {sortedCategories.map(([category, categoryItems]) => (
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
              {/* Header de catégorie - plus compact sur mobile */}
              <div className={`px-2.5 sm:px-3 py-1.5 sm:py-2 border-b ${getCategoryHeaderColor(category)}`}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-white dark:bg-stone-700 shadow-sm">
                    <span className="text-sm">{getCategoryEmoji(category)}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex-1">
                    {category}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {categoryItems.filter(item => item.isChecked).length}/{categoryItems.length}
                  </span>
                </div>
              </div>

              {/* Liste des items */}
              <div className="p-1.5 sm:p-2">
                <div className="space-y-1 sm:space-y-1.5">
                  {categoryItems.map((item, idx) => {
                    const isDragging = draggedItem?.name === item.name && draggedItem?.fromCategory === category;
                    const isNewlyAdded = newlyAddedIds.has(item.id);
                    const isEditing = editingItemId === item.id;

                    return (
                      <div
                        key={`${category}-${item.id}-${idx}`}
                        draggable={!isEditing}
                        onDragStart={(e) => !isEditing && handleDragStart(e, item.id, item.name, category)}
                        onDragEnd={handleDragEnd}
                        onClick={() => !isEditing && onToggleItem(item.id, item.isChecked)}
                        className={`
                          group relative flex items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg
                          ${!isEditing ? 'cursor-grab active:cursor-grabbing' : ''} transition-all duration-200
                          ${isDragging ? 'opacity-50 scale-95' : ''}
                          ${isEditing
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-400 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800'
                            : item.isChecked
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40'
                              : isNewlyAdded
                                ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm'
                                : item.isManuallyAdded
                                  ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                                  : 'bg-stone-50/50 dark:bg-stone-800/30 border border-stone-200/60 dark:border-stone-700/40 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm hover:bg-white dark:hover:bg-stone-800/50'
                          }
                        `}
                      >
                        {/* Checkbox - masquée en mode édition */}
                        {!isEditing && (
                          <div className="flex-shrink-0">
                            <div className={`
                              w-4 h-4 sm:w-5 sm:h-5 rounded border-2 sm:rounded-md flex items-center justify-center
                              ${item.isChecked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                              }
                            `}>
                              {item.isChecked && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />}
                            </div>
                          </div>
                        )}

                        {/* Contenu: texte ou input d'édition */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            /* Mode édition inline */
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={handleSaveInlineEdit}
                              autoFocus
                              disabled={isSaving}
                              className="w-full px-2 py-0.5 text-sm font-medium bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-stone-900 dark:text-stone-100"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            /* Mode affichage normal */
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className={`
                                text-sm font-medium
                                ${item.isChecked
                                  ? "line-through italic text-stone-400 dark:text-stone-500"
                                  : isNewlyAdded
                                    ? "text-amber-700 dark:text-amber-300"
                                    : item.isManuallyAdded
                                      ? "text-blue-700 dark:text-blue-300"
                                      : "text-stone-700 dark:text-stone-200"
                                }
                              `}>
                                {item.name}
                              </span>
                              {isNewlyAdded && !item.isChecked && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                                  Nouveau
                                </span>
                              )}
                              {item.isManuallyAdded && !isNewlyAdded && (
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
                              {/* Nom de l'utilisateur qui a coché */}
                              {item.checkedByUser && item.isChecked && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <span className="inline-block w-1 h-1 rounded-full bg-emerald-500"></span>
                                  {item.checkedByUser.pseudo || item.checkedByUser.name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Boutons d'action */}
                        {isEditing ? (
                          /* Indicateur de sauvegarde en cours */
                          isSaving && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          )
                        ) : (
                          <>
                            {/* Bouton éditer */}
                            {onEditItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(item);
                                }}
                                className="flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 sm:p-1.5 rounded-md sm:rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-opacity"
                                title="Modifier"
                              >
                                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-500 dark:text-stone-400" />
                              </button>
                            )}

                            {/* Bouton supprimer */}
                            {onRemoveItem && (
                              <button
                                onClick={(e) => handleRemoveItem(e, item.id)}
                                className="flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 sm:p-1.5 rounded-md sm:rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-opacity"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 dark:text-red-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
