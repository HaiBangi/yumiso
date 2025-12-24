"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, ShoppingCart, Sparkles, Lock, Globe, Check, Copy, Users2, MoreVertical } from "lucide-react";
import { WeeklyCalendar } from "@/components/meal-planner/weekly-calendar";
import { MealPlannerDialog } from "@/components/meal-planner/meal-planner-dialog-new";
import { EditPlanDialog } from "@/components/meal-planner/edit-plan-dialog";
import { ShoppingListDialog } from "@/components/meal-planner/shopping-list-dialog";
import { GenerateMenuDialog } from "@/components/meal-planner/generate-menu-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContributorsDialog } from "@/components/meal-planner/contributors-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {RealtimeShoppingListDialog} from "@/components/meal-planner/realtime-shopping-list-dialog";

function MealPlannerContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showContributors, setShowContributors] = useState(false);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Combiner tous les menus : d'abord les miens, puis les partagés
  const allPlans = [
    ...plans.filter(p => p.isOwner === true),
    ...plans.filter(p => p.isOwner !== true && p.canEdit === true)
  ];

  // Calculer canEdit
  const canEditPlan = selectedPlan ? (
    selectedPlan.canEdit === true || 
    selectedPlan.isOwner === true ||
    (session?.user?.id && selectedPlan.userId === session.user.id) ||
    (session?.user?.id && selectedPlan.contributors?.some((c: any) => c.userId === session.user.id && c.role === "CONTRIBUTOR"))
  ) : false;

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/meal-planner/saved");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        setPlansLoaded(true);
        
        // Si aucun plan n'est sélectionné et qu'il y a des plans, sélectionner le premier
        if (data.length > 0 && !selectedPlanId && !searchParams.get('plan')) {
          setSelectedPlanId(data[0].id);
          router.push(`/meal-planner?plan=${data[0].id}`, { scroll: false });
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des plans:", error);
      setPlansLoaded(true);
    }
  }, [router, searchParams, selectedPlanId]);

  const loadSpecificPlan = useCallback(async (planId: number) => {
    try {
      const res = await fetch(`/api/meal-planner/plan/${planId}`);
      if (res.ok) {
        const plan = await res.json();
        
        setPlans(prev => {
          const exists = prev.find(p => p.id === planId);
          if (exists) {
            return prev;
          }
          return [...prev, plan];
        });
        setAccessDenied(false);
      } else if (res.status === 403) {
        console.error("Accès refusé au plan");
        setAccessDenied(true);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du plan:", error);
    }
  }, []);

  // Charger tous les plans de l'utilisateur d'abord
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Gérer le plan sélectionné via l'URL - SEULEMENT après que fetchPlans soit terminé
  useEffect(() => {
    if (!plansLoaded) return;

    const planParam = searchParams.get('plan');
    if (planParam) {
      const planId = parseInt(planParam);
      if (!isNaN(planId)) {
        setSelectedPlanId(planId);
        
        const planExists = plans.find(p => p.id === planId);
        if (!planExists) {
          loadSpecificPlan(planId);
        }
      }
    }
  }, [searchParams, loadSpecificPlan, plans, plansLoaded]);

  const selectPlan = (planId: number) => {
    setSelectedPlanId(planId);
    router.push(`/meal-planner?plan=${planId}`, { scroll: false });
  };

  const handleCreatePlan = async (newPlanId?: number) => {
    await fetchPlans();
    if (newPlanId) {
      // Rediriger vers le nouveau plan créé
      selectPlan(newPlanId);
    }
  };

  const togglePublic = async () => {
    if (!selectedPlan || !selectedPlan.isOwner) return;
    
    setSharingLoading(true);
    try {
      const res = await fetch(`/api/meal-planner/plan/${selectedPlanId}/sharing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !selectedPlan.isPublic }),
      });
      
      if (res.ok) {
        await fetchPlans();
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    } finally {
      setSharingLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!selectedPlan) return;
    const shareUrl = `${window.location.origin}/meal-planner?plan=${selectedPlan.id}`;
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleUpdatePlanName = async (planId: number, newName: string) => {
    try {
      const res = await fetch(`/api/meal-planner/plan/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      
      if (res.ok) {
        await fetchPlans();
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/meal-planner/plan/${planToDelete}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        await fetchPlans();
        if (selectedPlanId === planToDelete) {
          const newPlan = plans.find(p => p.id !== planToDelete);
          if (newPlan) {
            selectPlan(newPlan.id);
          } else {
            setSelectedPlanId(null);
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setIsDeleting(false);
      setPlanToDelete(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-stone-600 dark:text-stone-400">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
        <div className="flex items-center justify-center py-20 px-4">
          <div className="max-w-md w-full bg-white dark:bg-stone-800 rounded-xl shadow-lg p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              Connexion requise
            </h2>
            <p className="text-stone-600 dark:text-stone-400">
              Veuillez vous connecter pour accéder au planificateur de repas et organiser vos menus de la semaine.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 pb-8">
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Header optimisé */}
        <div className="mb-4">
          {/* Mobile: Titre + Bouton Nouveau + Sélecteur */}
          <div className="flex sm:hidden flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                Planificateur
              </h1>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau</span>
              </Button>
            </div>
            
            {/* Sélecteur de menu sur mobile */}
            {allPlans.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={selectedPlanId?.toString()} onValueChange={(value) => selectPlan(parseInt(value))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue>
                      {selectedPlan ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <CalendarIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          <span className="font-medium truncate flex-1">{selectedPlan.name}</span>
                          {!selectedPlan.isOwner && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full flex-shrink-0">
                              Partagé
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-500">Sélectionner un menu</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        <div className="flex items-center gap-2 w-full max-w-[280px]">
                          <CalendarIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          <span className="flex-1 truncate">{plan.name}</span>
                          {!plan.isOwner && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full flex-shrink-0">
                              Partagé
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Menu à 3 points pour les actions du menu (uniquement si propriétaire) */}
                {selectedPlan && selectedPlan.isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 w-10 p-0 text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 flex-shrink-0"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs text-stone-500">Actions du menu</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setIsEditDialogOpen(true)}
                        className="cursor-pointer gap-2 text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-900/20"
                      >
                        <Edit2 className="h-4 w-4 text-orange-600" />
                        <span>Modifier le menu</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPlanToDelete(selectedPlanId)}
                        className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                        <span>Supprimer le menu</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {/* Boutons d'action sur mobile - scroll horizontal */}
            {selectedPlan && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => setShowGenerateMenu(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 flex-shrink-0"
                        disabled={session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER"}
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Générer le menu</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Créer automatiquement un menu complet de la semaine avec des recettes variées et équilibrées</p>
                      {session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER" && (
                        <p className="text-amber-400 mt-1">⭐ Fonctionnalité Premium</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button 
                  onClick={() => setShowShoppingList(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 flex-shrink-0"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Courses</span>
                </Button>
                {selectedPlan.isOwner && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        >
                          {selectedPlan.isPublic ? (
                            <Globe className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                          <span>Visibilité</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {/* ...existing dropdown content... */}
                        <DropdownMenuLabel>Visibilité du menu</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={togglePublic}
                          disabled={sharingLoading}
                          className="cursor-pointer"
                        >
                          {selectedPlan.isPublic ? (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              <div className="flex-1">
                                <div className="font-medium">Rendre privé</div>
                                <div className="text-xs text-stone-500">Seulement vous pouvez voir ce menu</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <Globe className="h-4 w-4 mr-2" />
                              <div className="flex-1">
                                <div className="font-medium">Rendre public</div>
                                <div className="text-xs text-stone-500">Partagez ce menu avec d&apos;autres</div>
                              </div>
                            </>
                          )}
                        </DropdownMenuItem>
                        {selectedPlan.isPublic && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={copyShareLink}
                              className="cursor-pointer"
                            >
                              {linkCopied ? (
                                <>
                                  <Check className="h-4 w-4 mr-2 text-emerald-600" />
                                  <span className="text-emerald-600 font-medium">Lien copié !</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
                                  <span>Copier le lien de partage</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowContributors(true)}
                          className="cursor-pointer"
                        >
                          <Users2 className="h-4 w-4 mr-2" />
                          <div className="flex-1">
                            <div className="font-medium">Gérer les contributeurs</div>
                            <div className="text-xs text-stone-500">
                              {selectedPlan.contributors?.length || 0} contributeur{(selectedPlan.contributors?.length || 0) > 1 ? "s" : ""}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Tout sur une ligne avec bouton Nouveau à gauche du dropdown */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 flex-shrink-0">
              Planificateur de Menus
            </h1>
            
            <div className="flex items-center gap-2">
              {/* Bouton Nouveau menu */}
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 flex-shrink-0 h-9"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau</span>
              </Button>
              
              {/* Sélecteur de menu dropdown */}
              {allPlans.length > 0 && (
                <div className="flex items-center gap-1">
                  <Select value={selectedPlanId?.toString()} onValueChange={(value) => selectPlan(parseInt(value))}>
                    <SelectTrigger className="w-[240px] h-9">
                      <SelectValue>
                        {selectedPlan ? (
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span className="font-medium truncate">{selectedPlan.name}</span>
                            {!selectedPlan.isOwner && (
                              <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full flex-shrink-0">
                                Partagé
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-500">Sélectionner un menu</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="w-[240px]">
                      {allPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          <div className="flex items-center gap-2 w-full">
                            <CalendarIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span className="flex-1 truncate">{plan.name}</span>
                            {!plan.isOwner && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full flex-shrink-0">
                                Partagé
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Boutons d'action pour le menu sélectionné (icônes uniquement) */}
                  {selectedPlan && selectedPlan.isOwner && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditDialogOpen(true)}
                        className="h-9 w-9 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        title="Modifier le menu"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPlanToDelete(selectedPlanId)}
                        className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Supprimer le menu"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}

              {selectedPlan && (
                <>
                  <div className="h-8 w-px bg-stone-200 dark:bg-stone-700" />

                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={() => setShowGenerateMenu(true)}
                          variant="outline"
                          size="sm"
                          className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 flex-shrink-0"
                          disabled={session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER"}
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>Générer le menu</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p>Créer automatiquement un menu complet de la semaine avec des recettes variées et équilibrées</p>
                        {session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER" && (
                          <p className="text-amber-400 mt-1">⭐ Fonctionnalité Premium</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button 
                    onClick={() => setShowShoppingList(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 flex-shrink-0"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Courses</span>
                  </Button>
                  {selectedPlan.isOwner && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                          >
                            {selectedPlan.isPublic ? (
                              <Globe className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                            <span>Visibilité</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Visibilité du menu</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={togglePublic}
                            disabled={sharingLoading}
                            className="cursor-pointer"
                          >
                            {selectedPlan.isPublic ? (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                <div className="flex-1">
                                  <div className="font-medium">Rendre privé</div>
                                  <div className="text-xs text-stone-500">Seulement vous pouvez voir ce menu</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <Globe className="h-4 w-4 mr-2" />
                                <div className="flex-1">
                                  <div className="font-medium">Rendre public</div>
                                  <div className="text-xs text-stone-500">Partagez ce menu avec d&apos;autres</div>
                                </div>
                              </>
                            )}
                          </DropdownMenuItem>
                          {selectedPlan.isPublic && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={copyShareLink}
                                className="cursor-pointer"
                              >
                                {linkCopied ? (
                                  <>
                                    <Check className="h-4 w-4 mr-2 text-emerald-600" />
                                    <span className="text-emerald-600 font-medium">Lien copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    <span>Copier le lien de partage</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setShowContributors(true)}
                            className="cursor-pointer"
                          >
                            <Users2 className="h-4 w-4 mr-2" />
                            <div className="flex-1">
                              <div className="font-medium">Gérer les contributeurs</div>
                              <div className="text-xs text-stone-500">
                                {selectedPlan.contributors?.length || 0} contributeur{(selectedPlan.contributors?.length || 0) > 1 ? "s" : ""}
                              </div>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 flex-shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                        onClick={() => setIsEditDialogOpen(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Modifier</span>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Calendar */}
        {accessDenied ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="py-20 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-stone-900 dark:text-stone-100">Accès refusé</h3>
              <p className="text-stone-600 dark:text-stone-400 mb-6 max-w-md mx-auto">
                Vous n&apos;avez pas les permissions nécessaires pour accéder à ce menu. 
                Il se peut que ce menu soit privé ou que vous n&apos;ayez pas été invité comme contributeur.
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => {
                    setAccessDenied(false);
                    if (allPlans.length > 0) {
                      selectPlan(allPlans[0].id);
                    } else {
                      router.push('/meal-planner');
                    }
                  }}
                  variant="outline"
                >
                  Retour à mes menus
                </Button>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un menu
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : selectedPlan ? (
          <WeeklyCalendar 
            plan={selectedPlan} 
            onRefresh={fetchPlans}
            canEdit={canEditPlan}
          />
        ) : !plansLoaded ? (
          <Card>
            <CardContent className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
                <p className="text-stone-600 dark:text-stone-400">Chargement de vos menus...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-20 text-center">
              <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-stone-300" />
              <h3 className="text-xl font-semibold mb-2">Aucun menu</h3>
              <p className="text-stone-500 mb-6">
                Créez votre premier menu hebdomadaire pour commencer
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un Menu
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <MealPlannerDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreatePlan}
      />
      
      {selectedPlan && (
        <>
          <EditPlanDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            plan={selectedPlan}
            onUpdate={handleUpdatePlanName}
          />
          
          <RealtimeShoppingListDialog
            open={showShoppingList}
            onOpenChange={setShowShoppingList}
            plan={selectedPlan}
            onUpdate={fetchPlans}
            canOptimize={canEditPlan}
          />
          
          <GenerateMenuDialog
            open={showGenerateMenu}
            onOpenChange={setShowGenerateMenu}
            planId={selectedPlan.id}
            onSuccess={fetchPlans}
          />
          
          <ContributorsDialog
            open={showContributors}
            onOpenChange={setShowContributors}
            planId={selectedPlan.id}
            isOwner={selectedPlan.isOwner || false}
          />
        </>
      )}

      {/* Delete Plan Confirmation Dialog */}
      <ConfirmDialog
        open={!!planToDelete}
        onOpenChange={(open) => !open && setPlanToDelete(null)}
        title="Supprimer ce menu ?"
        description={`Êtes-vous sûr de vouloir supprimer ${plans.find(p => p.id === planToDelete)?.name} ? Tous les repas planifiés seront également supprimés. Cette action est irréversible.`}
        onConfirm={handleDeletePlan}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  );
}

export default function MealPlannerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-stone-600 dark:text-stone-400">Chargement du planificateur...</p>
        </div>
      </div>
    }>
      <MealPlannerContent />
    </Suspense>
  );
}
