"use client";

import { useMemo, useState } from "react";
import { ShoppingItem, CATEGORY_ORDER, getCategoryEmoji } from "./shopping-list-content";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Store, Trash2, Edit2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface StoreGroupedViewProps {
  items: Record<string, ShoppingItem[]>;
  onToggleItem: (itemId: number, isChecked: boolean) => void;
  onRemoveItem?: (itemId: number) => Promise<{ success: boolean; error?: string }>;
  onEditItem?: (itemId: number, newName: string, store?: string | null) => Promise<{ success: boolean; error?: string }>;
  onMoveItemToStore?: (itemId: number, newStore: string | null) => Promise<{ success: boolean; error?: string }>;
  newlyAddedIds?: Set<number>;
  accentColor?: "emerald" | "blue";
  renderItemContent: (item: ShoppingItem, category: string) => React.ReactNode;
}

interface GroupedByStore {
  [storeName: string]: {
    [category: string]: ShoppingItem[];
  };
}

export function StoreGroupedView({
  items,
  onToggleItem,
  onRemoveItem,
  onEditItem,
  onMoveItemToStore,
  newlyAddedIds,
  accentColor = "emerald",
  renderItemContent
}: StoreGroupedViewProps) {

  // Grouper les items par enseigne puis par catégorie
  const groupedByStore = useMemo<GroupedByStore>(() => {
    const grouped: GroupedByStore = {};

    Object.entries(items).forEach(([category, categoryItems]) => {
      categoryItems.forEach((item) => {
        const storeName = item.store || "Sans enseigne";

        if (!grouped[storeName]) {
          grouped[storeName] = {};
        }

        if (!grouped[storeName][category]) {
          grouped[storeName][category] = [];
        }

        grouped[storeName][category].push(item);
      });
    });

    return grouped;
  }, [items]);

  // Obtenir la liste des enseignes triées (Sans enseigne en dernier)
  const sortedStores = useMemo(() => {
    const stores = Object.keys(groupedByStore);
    const withoutStore = stores.filter(s => s === "Sans enseigne");
    const withStore = stores.filter(s => s !== "Sans enseigne").sort((a, b) => a.localeCompare(b, 'fr'));
    return [...withStore, ...withoutStore];
  }, [groupedByStore]);

  // État pour les accordéons (desktop)
  const [expandedStores, setExpandedStores] = useState<Set<string>>(
    new Set(sortedStores) // Tous ouverts par défaut
  );

  const toggleStore = (storeName: string) => {
    const newExpanded = new Set(expandedStores);
    if (newExpanded.has(storeName)) {
      newExpanded.delete(storeName);
    } else {
      newExpanded.add(storeName);
    }
    setExpandedStores(newExpanded);
  };

  // Calculer le nombre total d'articles par enseigne
  const getStoreItemCount = (storeName: string) => {
    const storeData = groupedByStore[storeName];
    return Object.values(storeData).reduce((sum, items) => sum + items.length, 0);
  };

  // Rendu d'une section de catégorie
  const renderCategorySection = (category: string, categoryItems: ShoppingItem[], storeName: string) => {
    if (categoryItems.length === 0) return null;

    return (
      <div key={category} className="space-y-2">
        <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2">
          <span>{getCategoryEmoji(category)}</span>
          <span>{category}</span>
          <span className="text-xs text-stone-500">({categoryItems.length})</span>
        </h4>
        <div className="space-y-1.5">
          {categoryItems.map((item) => (
            <div key={item.id}>
              {renderItemContent(item, category)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Rendu du contenu d'une enseigne
  const renderStoreContent = (storeName: string) => {
    const storeData = groupedByStore[storeName];
    if (!storeData) return null;

    // Organiser les catégories en rows de 3 (comme demandé)
    const categories = CATEGORY_ORDER.filter(cat => storeData[cat] && storeData[cat].length > 0);
    const rows: string[][] = [];
    for (let i = 0; i < categories.length; i += 3) {
      rows.push(categories.slice(i, i + 3));
    }

    return (
      <div className="space-y-6 p-4">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {row.map((category) => (
              <div key={category}>
                {renderCategorySection(category, storeData[category], storeName)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Vue Desktop : Accordéons par enseigne
  const renderDesktopView = () => (
    <div className="hidden md:block space-y-4">
      {sortedStores.map((storeName) => {
        const isExpanded = expandedStores.has(storeName);
        const itemCount = getStoreItemCount(storeName);

        return (
          <Card key={storeName} className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleStore(storeName)}>
              <div
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                  isExpanded
                    ? `bg-${accentColor}-50 dark:bg-${accentColor}-950/20`
                    : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }`}
              >
                <CollapsibleTrigger className="flex-1 flex items-center gap-3 text-left">
                  <div className={`p-2 rounded-lg bg-${accentColor}-100 dark:bg-${accentColor}-900/30`}>
                    <Store className={`h-5 w-5 text-${accentColor}-600 dark:text-${accentColor}-400`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-stone-900 dark:text-stone-100">
                      {storeName}
                    </h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {itemCount} article{itemCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-stone-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-stone-400" />
                    )}
                  </div>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                {renderStoreContent(storeName)}
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );

  // Vue Mobile : Onglets par enseigne
  const renderMobileView = () => (
    <div className="md:hidden">
      <Tabs defaultValue={sortedStores[0]} className="w-full">
        <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${sortedStores.length}, 1fr)` }}>
          {sortedStores.map((storeName) => {
            const itemCount = getStoreItemCount(storeName);
            return (
              <TabsTrigger
                key={storeName}
                value={storeName}
                className="flex flex-col gap-1 py-2 text-xs"
              >
                <Store className="h-4 w-4" />
                <span className="truncate max-w-full">{storeName}</span>
                <span className="text-[10px] text-muted-foreground">({itemCount})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sortedStores.map((storeName) => (
          <TabsContent key={storeName} value={storeName} className="mt-4">
            <Card className="overflow-hidden">
              {renderStoreContent(storeName)}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );

  if (sortedStores.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucun article dans la liste</p>
      </div>
    );
  }

  return (
    <>
      {renderDesktopView()}
      {renderMobileView()}
    </>
  );
}
