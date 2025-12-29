"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Loader2, Plus, UserPlus, Trash2 } from "lucide-react";

// Catégories avec emojis et mots-clés pour le classement automatique
export const CATEGORIES: Record<string, { emoji: string; keywords: string[] }> = {
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
  "Viandes & Poissons": {
    emoji: "🥩",
    keywords: [
      "viande", "boeuf", "veau", "porc", "agneau", "mouton", "poulet", "dinde",
      "canard", "lapin", "steak", "côte", "escalope", "filet", "rôti", "gigot",
      "jambon", "lard", "bacon", "saucisse", "merguez", "chipolata", "boudin",
      "pâté", "terrine", "foie", "andouillette",
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
  name: string;
  isChecked: boolean;
  isManuallyAdded: boolean;
  checkedByUser: { pseudo: string; name: string | null } | null;
}

// Props du composant
interface ShoppingListContentProps {
  // Données
  items: Record<string, ShoppingItem[]>;
  
  // Actions
  onToggleItem: (itemName: string, category: string, isChecked: boolean) => void;
  onAddItem?: (itemName: string, category: string) => Promise<{ success: boolean; error?: string }>;
  onRemoveItem?: (itemName: string, category: string) => Promise<{ success: boolean; error?: string }>;
  onMoveItem?: (itemName: string, fromCategory: string, toCategory: string) => Promise<{ success: boolean; error?: string }>;
  
  // Options d'affichage
  showAddForm?: boolean;
  gridClassName?: string;
  isCompact?: boolean;
}

export function ShoppingListContent({
  items,
  onToggleItem,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  showAddForm = true,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6",
  isCompact = false,
}: ShoppingListContentProps) {
  // États pour l'ajout d'article
  const [newItemName, setNewItemName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // États pour le drag and drop
  const [draggedItem, setDraggedItem] = useState<{ name: string; fromCategory: string } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // Trier et filtrer les catégories
  const sortedCategories = Object.entries(items)
    .filter(([, categoryItems]) => categoryItems.length > 0)
    .sort(([a], [b]) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

  // Handler pour ajouter un article
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !onAddItem) return;

    setIsAddingItem(true);
    setAddItemError(null);

    const category = categorizeIngredient(newItemName.trim());
    const result = await onAddItem(newItemName.trim(), category);

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
    if (draggedItem && draggedItem.fromCategory !== toCategory && onMoveItem) {
      await onMoveItem(draggedItem.name, draggedItem.fromCategory, toCategory);
    }
    setDraggedItem(null);
    setDragOverCategory(null);
  };

  // Handler pour supprimer un article
  const handleRemoveItem = async (e: React.MouseEvent, itemName: string, category: string) => {
    e.stopPropagation();
    if (onRemoveItem) {
      await onRemoveItem(itemName, category);
    }
  };

  return (
    <>
      {/* Formulaire d'ajout d'article */}
      {showAddForm && onAddItem && (
        <div className="mb-2">
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

      {/* Grille des catégories */}
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
            {/* Header de catégorie */}
            <div className={`px-${isCompact ? '3' : '4'} py-${isCompact ? '2' : '3'} border-b ${getCategoryHeaderColor(category)}`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex items-center justify-center ${isCompact ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-white dark:bg-stone-700 shadow-sm`}>
                  <span className={isCompact ? 'text-sm' : 'text-lg'}>{getCategoryEmoji(category)}</span>
                </div>
                <h3 className={`font-semibold ${isCompact ? 'text-sm' : 'text-base'} text-stone-900 dark:text-stone-100 flex-1`}>
                  {category}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {categoryItems.length}
                </span>
              </div>
            </div>

            {/* Liste des items */}
            <div className={`p-${isCompact ? '2' : '2.5'}`}>
              <div className="space-y-1.5">
                {categoryItems.map((item, idx) => {
                  const isDragging = draggedItem?.name === item.name && draggedItem?.fromCategory === category;

                  return (
                    <div
                      key={`${category}-${item.name}-${idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.name, category)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onToggleItem(item.name, category, item.isChecked)}
                      className={`
                        group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg 
                        cursor-grab active:cursor-grabbing
                        ${isDragging ? 'opacity-50 scale-95' : ''}
                        ${item.isChecked
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40'
                          : item.isManuallyAdded
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
                            : item.isManuallyAdded
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-stone-700 dark:text-stone-200"
                          }
                        `}>
                          {item.name}
                          {item.isManuallyAdded && (
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
                      </div>

                      {/* Bouton supprimer */}
                      {onRemoveItem && (
                        <button
                          onClick={(e) => handleRemoveItem(e, item.name, category)}
                          className="flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-opacity"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
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
    </>
  );
}
