"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRealtimeShoppingList } from "@/hooks/use-realtime-shopping-list";
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
import { ArrowLeft, CalendarDays, Check, Loader2, ShoppingCart, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { ShoppingListLoader } from "@/components/meal-planner/shopping-list-loader";
import { ContributorsDialog } from "@/components/shopping-lists/contributors-dialog";
import { 
  ShoppingListContent, 
  ShoppingItem, 
  CATEGORY_ORDER, 
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

  const [listData, setListData] = useState<ShoppingListData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour l'optimisation AI
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);

  // État pour le dialog des contributeurs
  const [showContributors, setShowContributors] = useState(false);

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
    const mergedList: Record<string, ShoppingItem[]> = {};

    CATEGORY_ORDER.forEach(cat => {
      mergedList[cat] = [];
    });

    // Utiliser uniquement les items temps réel (ShoppingListItem de la DB)
    // Filtrer les items undefined ou invalides
    realtimeItems
      .filter(item => item && item.ingredientName)
      .forEach(item => {
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

  const totalItems = Object.values(displayList).reduce((acc, items) => acc + items.length, 0);
  const checkedCount = Object.values(displayList).reduce((acc, items) =>
    acc + items.filter(item => item.isChecked).length, 0
  );

  // Handlers pour le composant ShoppingListContent
  const handleToggleItem = (itemName: string, category: string, isChecked: boolean) => {
    toggleIngredient(itemName, category, isChecked);
  };

  const handleAddItem = async (itemName: string, category: string) => {
    return await addItem(itemName, category);
  };

  const handleRemoveItem = async (itemName: string, category: string) => {
    return await removeItem(itemName, category);
  };

  const handleMoveItem = async (itemName: string, fromCategory: string, toCategory: string) => {
    return await moveItem(itemName, fromCategory, toCategory);
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
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6 md:px-8">
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

              {planId && (session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
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
            <ShoppingListContent
              items={displayList}
              onToggleItem={handleToggleItem}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onMoveItem={handleMoveItem}
              showAddForm={true}
              gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
              accentColor={isLinkedToMenu ? "emerald" : "blue"}
            />
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
    </div>
  );
}