"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRealtimeShoppingList } from "@/hooks/use-realtime-shopping-list";
import { usePremium } from "@/hooks/use-premium";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, CalendarDays, Check, CheckCheck, Loader2, RotateCcw, ShoppingCart, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { ShoppingListLoader } from "@/components/meal-planner/shopping-list-loader";
import { ContributorsDialog } from "@/components/shopping-lists/contributors-dialog";
import { AddRecipesButton } from "@/components/shopping-lists/add-recipes-button";
import { StoreGroupedShoppingList } from "@/components/shopping-lists/StoreGroupedShoppingList";
import { AddItemForm } from "@/components/shopping-lists/AddItemForm";
import {
  ShoppingItem,
  categorizeIngredient
} from "@/components/shopping-lists/shopping-list-content";

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
  const { isPremium } = usePremium();

  const [listData, setListData] = useState<ShoppingListData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allStores, setAllStores] = useState<Array<{ id: number; name: string; logoUrl: string | null; color: string; displayOrder: number; isActive: boolean }>>([]);

  // États pour l'optimisation AI
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);

  // États pour la réinitialisation (listes perso uniquement)
  const [isResetting, setIsResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // États pour la suppression des éléments cochés
  const [isClearingChecked, setIsClearingChecked] = useState(false);
  const [showClearCheckedDialog, setShowClearCheckedDialog] = useState(false);

  // État pour le dialog des contributeurs
  const [showContributors, setShowContributors] = useState(false);

  // Fonction pour charger les enseignes disponibles
  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        const stores = await res.json();
        setAllStores(stores);
      }
    } catch (err) {
      console.error("Erreur chargement enseignes:", err);
    }
  };

  // Charger les enseignes disponibles au démarrage
  useEffect(() => {
    if (status === "authenticated") {
      fetchStores();
    }
  }, [status]);

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
    newlyAddedIds,
    toggleIngredient,
    addItem,
    addItems,
    removeItem,
    moveItem,
    editItem,
    moveItemToStore,
    resetList,
    clearCheckedItems,
    availableStores,
    isLoading: isLoadingItems,
  } = useRealtimeShoppingList(hookOptions);

  // PlanId pour l'optimisation des listes liées à un menu
  const planId = listData?.weeklyMealPlanId;

  // Fonction pour optimiser la liste avec ChatGPT (fonctionne pour TOUTES les listes)
  const handleOptimize = async () => {
    if (isOptimizing) return;

    setIsOptimizing(true);
    setError(null);

    try {
      // Si la liste est liée à un menu, utiliser l'ancienne API
      if (planId) {
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

          // Log des stats si disponibles
          if (data.stats) {
            console.log(`📊 Optimisation: ${data.stats.originalCount} → ${data.stats.optimizedCount} articles`);
          }
        }

        // Rafraîchir les données du composant
        router.refresh();
      } else {
        // Pour les listes standalone, utiliser la nouvelle API d'optimisation
        const res = await fetch(`/api/shopping-lists/${listId}/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          const errorData = await res.json();
          setError(errorData.error || 'Erreur lors de l\'optimisation');
          setIsOptimizing(false);
          return;
        }

        const data = await res.json();

        if (data.success && data.stats) {
          console.log(`📊 Optimisation: ${data.stats.originalCount} → ${data.stats.optimizedCount} articles`);
        }

        // Rafraîchir les données du composant
        router.refresh();
      }
    } catch (err) {
      console.error('Erreur optimisation:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'optimisation');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Fonction pour réinitialiser la liste (uniquement pour les listes perso)
  const handleResetList = async () => {
    if (!resetList || isResetting) return;

    setIsResetting(true);
    const result = await resetList();
    setIsResetting(false);
    setShowResetDialog(false);

    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  // Fonction pour supprimer tous les éléments cochés
  const handleClearChecked = async () => {
    if (!clearCheckedItems || isClearingChecked) return;

    setIsClearingChecked(true);
    const result = await clearCheckedItems();
    setIsClearingChecked(false);
    setShowClearCheckedDialog(false);

    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  // Construire la liste de courses groupée par enseigne puis par catégorie
  const displayList = useMemo(() => {
    console.log(`[displayList] Reconstruction avec ${realtimeItems.length} items`);

    // Structure: { [storeName]: { [category]: items[] } }
    const mergedByStore: Record<string, Record<string, ShoppingItem[]>> = {};

    // Filtrer les items undefined ou invalides
    realtimeItems
      .filter(item => item && item.ingredientName)
      .forEach(item => {
        const category = item.category || categorizeIngredient(item.ingredientName);
        const storeName = item.store?.name || "Sans enseigne"; // Groupe par défaut
        const itemKey = `${item.id}`;

        // Vérifier si supprimé
        if (removedItemKeys.has(itemKey)) {
          console.log(`[displayList] ⏭️ Item ${item.id} "${item.ingredientName}" est marqué comme supprimé`);
          return;
        }

        // Initialiser l'enseigne si nécessaire
        if (!mergedByStore[storeName]) {
          mergedByStore[storeName] = {};
        }

        // Initialiser la catégorie dans l'enseigne si nécessaire
        if (!mergedByStore[storeName][category]) {
          mergedByStore[storeName][category] = [];
        }

        // DEBUG
        if (item.isManuallyAdded) {
          console.log(`🔍 [DEBUG] Item "${item.ingredientName}" a isManuallyAdded = true`);
        }

        console.log(`[displayList] ➕ Ajout item ${item.id}: "${item.ingredientName}" dans ${storeName} > ${category}`);

        mergedByStore[storeName][category].push({
          id: item.id,
          name: item.ingredientName,
          isChecked: item.isChecked,
          isManuallyAdded: item.isManuallyAdded,
          checkedByUser: item.checkedByUser,
        });
      });

    // Calculer le total
    const totalItems = Object.values(mergedByStore).reduce((total, storeCategories) =>
      total + Object.values(storeCategories).reduce((catTotal, items) => catTotal + items.length, 0), 0
    );
    console.log('[displayList] 📊 Résultat:', totalItems, 'items au total dans', Object.keys(mergedByStore).length, 'enseigne(s)');
    return mergedByStore;
  }, [realtimeItems, removedItemKeys]);

  // Calculer les totaux en tenant compte de la nouvelle structure groupée
  const totalItems = Object.values(displayList).reduce((total, storeCategories) =>
    total + Object.values(storeCategories).reduce((catTotal, items) => catTotal + items.length, 0), 0
  );
  const checkedCount = Object.values(displayList).reduce((total, storeCategories) =>
    total + Object.values(storeCategories).reduce((catTotal, items) =>
      catTotal + items.filter(item => item.isChecked).length, 0
    ), 0
  );

  // Handlers pour le composant ShoppingListContent
  const handleToggleItem = (itemId: number, isChecked: boolean) => {
    toggleIngredient(itemId, isChecked);
  };

  const handleAddItem = async (itemName: string, category: string, storeId?: number | null, storeName?: string | null) => {
    const result = await addItem(itemName, category, storeId, storeName);

    // Si l'ajout a réussi et qu'un nom d'enseigne a été fourni, rafraîchir la liste des enseignes
    // pour récupérer une éventuelle nouvelle enseigne créée
    if (result.success && storeName) {
      await fetchStores();
    }

    return result;
  };

  const handleRemoveItem = async (itemId: number) => {
    return await removeItem(itemId);
  };

  const handleMoveItem = async (itemName: string, fromCategory: string, toCategory: string) => {
    return await moveItem(itemName, fromCategory, toCategory);
  };

  const handleEditItem = async (itemId: number, newName: string) => {
    return await editItem(itemId, newName);
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

  // Déterminer si c'est une liste liée à un menu ou indépendante
  const isLinkedToMenu = !!listData.weeklyMealPlanId;

  // Couleurs selon le type de liste
  const themeColors = isLinkedToMenu
    ? {
        bgPage: "bg-emerald-50 dark:bg-stone-900",
        iconColor: "text-emerald-600",
        completeBg: "bg-emerald-50 dark:bg-emerald-900/30",
        completeText: "text-emerald-700 dark:text-emerald-300",
      }
    : {
        bgPage: "bg-blue-50 dark:bg-stone-900",
        iconColor: "text-blue-600",
        completeBg: "bg-violet-50 dark:bg-violet-900/30",
        completeText: "text-violet-700 dark:text-violet-300",
      };

  return (
    <div className={`min-h-screen ${themeColors.bgPage}`}>
      {/* Header simplifié avec titre et indicateurs */}
      <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 md:px-8">
        {/* Desktop: Layout original */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/shopping-lists" className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-stone-800/50 transition-colors">
              <ArrowLeft className="h-5 w-5 text-stone-600 dark:text-stone-400" />
            </Link>
            <ShoppingCart className={`h-6 w-6 ${themeColors.iconColor}`} />
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {listData.name}
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {checkedCount} / {totalItems} articles cochés
              </p>
            </div>
          </div>

          {/* Boutons actions Desktop */}
          <div className="flex items-center gap-3">
            {listData.weeklyMealPlanId && (
              <Link href={`/meal-planner?plan=${listData.weeklyMealPlanId}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
                >
                  <CalendarDays className="h-4 w-4" />
                  Voir le menu
                </Button>
              </Link>
            )}

            {/* Bouton pour ajouter des recettes */}
            <AddRecipesButton
              onAddIngredients={async (ingredients: Array<{ name: string; category: string }>) => {
                console.log('[Page] Ajout de', ingredients.length, 'ingrédients');
                // Optimisation : ajout en batch (une seule requête au lieu de N requêtes)
                const result = await addItems(ingredients);
                console.log('[Page] Résultat addItems:', result);

                if (result.success && result.addedCount) {
                  console.log('[Page] ✅ Ingrédients ajoutés avec succès');
                  // Pas besoin de toast ici, déjà géré par AddRecipeIngredients
                  // Forcer un re-render en mettant à jour l'état (si nécessaire)
                } else if (result.error) {
                  console.error('[Page] ❌ Erreur:', result.error);
                }
              }}
              accentColor={isLinkedToMenu ? "emerald" : "blue"}
            />

            {listData.isOwner && (
              <Button
                onClick={() => setShowContributors(true)}
                size="sm"
                variant="outline"
                className="gap-2 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
              >
                <Users2 className="h-4 w-4" />
                Gérer les accès
              </Button>
            )}

            {/* Bouton Optimiser - disponible pour TOUTES les listes (Premium uniquement) */}
            {isPremium && totalItems > 0 && (
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
                    Optimisation...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Optimiser
                  </>
                )}
              </Button>
            )}

            {/* Bouton supprimer les cochés */}
            {listData.canEdit && checkedCount > 0 && (
              <Button
                onClick={() => setShowClearCheckedDialog(true)}
                disabled={isClearingChecked}
                size="sm"
                variant="outline"
                className="gap-2 bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 hover:border-orange-300 dark:bg-stone-800 dark:hover:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50"
              >
                {isClearingChecked ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                Supprimer cochés ({checkedCount})
              </Button>
            )}

            {/* Bouton réinitialiser - uniquement pour les listes perso (non liées à un menu) */}
            {!isLinkedToMenu && listData.canEdit && totalItems > 0 && (
              <Button
                onClick={() => setShowResetDialog(true)}
                disabled={isResetting}
                size="sm"
                variant="outline"
                className="gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 dark:bg-stone-800 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800/50"
              >
                {isResetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {/* Mobile: Layout compact sans flèche retour */}
        <div className="sm:hidden">
          {/* Titre + Compteur + Boutons sur la même ligne */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ShoppingCart className={`h-5 w-5 ${themeColors.iconColor} flex-shrink-0`} />
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold text-stone-900 dark:text-stone-100 truncate leading-tight">
                  {listData.name}
                </h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {checkedCount}/{totalItems} cochés
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {listData.weeklyMealPlanId && (
                <Link href={`/meal-planner?plan=${listData.weeklyMealPlanId}`}>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600">
                    <CalendarDays className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}

              {/* Bouton pour ajouter des recettes - Mobile */}
              <AddRecipesButton
                onAddIngredients={async (ingredients: Array<{ name: string; category: string }>) => {
                  console.log('[Page Mobile] Ajout de', ingredients.length, 'ingrédients');
                  const result = await addItems(ingredients);
                  console.log('[Page Mobile] Résultat addItems:', result);

                  if (result.success && result.addedCount) {
                    console.log('[Page Mobile] ✅ Ingrédients ajoutés avec succès');
                  } else if (result.error) {
                    console.error('[Page Mobile] ❌ Erreur:', result.error);
                  }
                }}
                accentColor={isLinkedToMenu ? "emerald" : "blue"}
                compact={true}
              />

              {listData.isOwner && (
                <Button
                  onClick={() => setShowContributors(true)}
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600"
                >
                  <Users2 className="h-3.5 w-3.5" />
                </Button>
              )}

              {/* Bouton supprimer cochés - Mobile */}
              {(listData.canEdit || listData.isOwner) && checkedCount > 0 && (
                <Button
                  onClick={() => setShowClearCheckedDialog(true)}
                  disabled={isClearingChecked}
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 bg-white hover:bg-orange-50 border-orange-200 dark:bg-stone-800 dark:hover:bg-orange-900/20 dark:border-orange-800/50"
                  title={`Supprimer ${checkedCount} élément(s) coché(s)`}
                >
                  {isClearingChecked ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5 text-orange-500" />
                  )}
                </Button>
              )}

              {/* Bouton réinitialiser - uniquement pour les listes perso */}
              {!isLinkedToMenu && listData.canEdit && totalItems > 0 && (
                <Button
                  onClick={() => setShowResetDialog(true)}
                  disabled={isResetting}
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 bg-white hover:bg-red-50 border-red-200 dark:bg-stone-800 dark:hover:bg-red-900/20 dark:border-red-800/50"
                >
                  {isResetting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5 text-red-500" />
                  )}
                </Button>
              )}

              {/* Bouton Optimiser - disponible pour TOUTES les listes (Premium uniquement) */}
              {isPremium && totalItems > 0 && (
                <Button
                  onClick={() => setShowOptimizeDialog(true)}
                  disabled={isOptimizing}
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600"
                >
                  {isOptimizing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
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
            {/* Message si tout est coché */}
            {checkedCount === totalItems && totalItems > 0 && (
              <div className={`mb-4 p-4 ${themeColors.completeBg} rounded-lg flex items-center gap-3 ${themeColors.completeText}`}>
                <Check className="h-5 w-5" />
                <span className="font-semibold">Toutes les courses sont faites ! 🎉</span>
              </div>
            )}

            {/* Contenu de la liste */}
            <div className="space-y-4">
              {/* Formulaire d'ajout en haut */}
              <AddItemForm onAddItem={handleAddItem} availableStores={allStores} />

              {/* Liste groupée par enseigne */}
              <StoreGroupedShoppingList
                itemsByStore={displayList}
                onToggleItem={handleToggleItem}
                onRemoveItem={handleRemoveItem}
                onMoveItem={handleMoveItem}
                onEditItem={handleEditItem}
                onMoveItemToStore={moveItemToStore}
                showAddForm={false}
                accentColor={isLinkedToMenu ? "emerald" : "blue"}
                isLoading={isLoadingItems}
                newlyAddedIds={newlyAddedIds}
                availableStores={allStores}
              />
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
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Optimiser la liste de courses
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
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

      {/* Dialog de confirmation de réinitialisation */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-red-500" />
              Réinitialiser la liste ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left">
                <p>Cette action va supprimer <strong>tous les articles</strong> de cette liste de courses.</p>
                <p className="text-red-500 dark:text-red-400 font-medium">
                  ⚠️ Cette action est irréversible.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetList}
              disabled={isResetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Réinitialiser
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmation pour supprimer les éléments cochés */}
      <AlertDialog open={showClearCheckedDialog} onOpenChange={setShowClearCheckedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCheck className="h-5 w-5 text-orange-500" />
              Supprimer les éléments cochés
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left">
                <p>
                  Voulez-vous supprimer les <strong>{checkedCount}</strong> article{checkedCount > 1 ? 's' : ''} coché{checkedCount > 1 ? 's' : ''} de la liste ?
                </p>
                <p className="text-orange-600 dark:text-orange-400 font-medium">
                  ⚠️ Cette action est irréversible.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearChecked}
              disabled={isClearingChecked}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isClearingChecked ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Supprimer ({checkedCount})
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
