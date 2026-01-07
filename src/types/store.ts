// Types pour les enseignes
export interface Store {
  id: number;
  name: string;
  logoUrl: string | null;
  color: string;
  isActive: boolean;
  isGlobal?: boolean; // true = enseigne partagée, false = créée par un user
  userId?: string | null; // ID de l'utilisateur qui a créé l'enseigne (null si globale)
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
