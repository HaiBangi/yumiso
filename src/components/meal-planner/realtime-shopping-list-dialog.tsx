"use client";

import { ShoppingListDialog } from "./shopping-list-dialog";
import { useRealtimeShoppingList } from "@/hooks/use-realtime-shopping-list";
import { useMemo } from "react";
import { Wifi, WifiOff } from "lucide-react";

interface RealtimeShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any;
  onUpdate?: () => void;
  canOptimize?: boolean;
}

export function RealtimeShoppingListDialog({
  open,
  onOpenChange,
  plan,
  onUpdate,
  canOptimize = false,
}: RealtimeShoppingListDialogProps) {
  const { items: realtimeItems, toggleIngredient, isConnected, isLoading } = useRealtimeShoppingList(
    open ? plan?.id : null
  );

  // Merger les données temps réel avec la liste de courses statique
  const enhancedPlan = useMemo(() => {
    if (!plan || realtimeItems.length === 0) return plan;

    // Créer un map des items cochés
    const checkedMap = new Map<string, boolean>();
    realtimeItems.forEach((item) => {
      const key = `${item.ingredientName}`;
      checkedMap.set(key, item.isChecked);
    });

    return {
      ...plan,
      _realtimeChecked: checkedMap,
      _realtimeItems: realtimeItems,
    };
  }, [plan, realtimeItems]);

  return (
    <>
      {/* Indicateur de connexion temps réel */}
      {open && (
        <div className="fixed top-20 right-4 z-[100]">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-stone-800 shadow-lg border border-stone-200 dark:border-stone-700 transition-all">
            {isLoading ? (
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            ) : isConnected ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
      )}

      <ShoppingListDialog
        open={open}
        onOpenChange={onOpenChange}
        plan={enhancedPlan}
        onUpdate={onUpdate}
        canOptimize={canOptimize}
        realtimeToggle={toggleIngredient}
        realtimeItems={realtimeItems}
      />
    </>
  );
}
