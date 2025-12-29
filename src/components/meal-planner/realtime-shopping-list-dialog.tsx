"use client";

import { ShoppingListDialog } from "./shopping-list-dialog";
import { useRealtimeShoppingList } from "@/hooks/use-realtime-shopping-list";
import { useMemo } from "react";

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
  const { items: realtimeItems, removedItemKeys, toggleIngredient, addItem, removeItem, moveItem, isConnected: _isConnected, isLoading: _isLoading } = useRealtimeShoppingList(
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
      <ShoppingListDialog
        open={open}
        onOpenChange={onOpenChange}
        plan={enhancedPlan}
        onUpdate={onUpdate}
        canOptimize={canOptimize}
        realtimeToggle={toggleIngredient}
        realtimeItems={realtimeItems}
        realtimeRemovedItemKeys={removedItemKeys}
        realtimeAddItem={addItem}
        realtimeRemoveItem={removeItem}
        realtimeMoveItem={moveItem}
      />
    </>
  );
}
