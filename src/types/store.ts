// Types pour les enseignes
export interface Store {
  id: number;
  name: string;
  logoUrl: string | null;
  color: string;
  isActive: boolean;
  displayOrder: number;
}

// Type enrichi pour ShoppingListItem avec enseigne
export interface ShoppingListItemWithStore {
  id: number;
  ingredientName: string;
  category: string;
  storeId: number | null;
  store: Store | null; // Relation incluse via Prisma
  isChecked: boolean;
  isManuallyAdded: boolean;
  // ... autres champs
}
