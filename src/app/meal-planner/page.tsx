"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, ShoppingCart, Sparkles, Lock, Globe, Check, Copy } from "lucide-react";
import { WeeklyCalendar } from "@/components/meal-planner/weekly-calendar";
import { MealPlannerDialog } from "@/components/meal-planner/meal-planner-dialog-new";
import { EditPlanDialog } from "@/components/meal-planner/edit-plan-dialog";
import { ShoppingListDialog } from "@/components/meal-planner/shopping-list-dialog";
import { GenerateMenuDialog } from "@/components/meal-planner/generate-menu-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MealPlannerPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Gérer le plan sélectionné via l'URL
  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam) {
      const planId = parseInt(planParam);
      if (!isNaN(planId)) {
        setSelectedPlanId(planId);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/meal-planner/saved");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        
        // Si aucun plan n'est sélectionné et qu'il y a des plans, sélectionner le premier
        if (data.length > 0 && !selectedPlanId && !searchParams.get('plan')) {
          setSelectedPlanId(data[0].id);
          router.push(`/meal-planner?plan=${data[0].id}`, { scroll: false });
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectPlan = (planId: number) => {
    setSelectedPlanId(planId);
    router.push(`/meal-planner?plan=${planId}`, { scroll: false });
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
    const shareUrl = `${window.location.origin}/meal-planner/${selectedPlan.id}`;
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

  if (!session) {
    return (
      <div className="flex items-center justify-center py-20">
        <p>Veuillez vous connecter pour accéder au planificateur de menus.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 pb-8">
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
                Planificateur de Menus
              </h1>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nouveau Menu</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Plans List avec boutons alignés à droite */}
        <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center justify-between gap-4">
            {/* Liste des menus scrollable */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border-2 transition-all cursor-pointer flex-shrink-0 ${
                    selectedPlanId === plan.id
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30"
                      : "border-stone-200 dark:border-stone-700 hover:border-emerald-300"
                  }`}
                  onClick={() => selectPlan(plan.id)}
                >
                  <CalendarIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap text-sm sm:text-base">{plan.name}</span>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanId(plan.id);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlanToDelete(plan.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Boutons alignés à droite */}
            {selectedPlan && (
              <div className="flex gap-2 flex-shrink-0">
                <Button 
                  onClick={() => setShowGenerateMenu(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden lg:inline">Générer</span>
                </Button>
                <Button 
                  onClick={() => setShowShoppingList(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden lg:inline">Courses</span>
                </Button>
                {selectedPlan.isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        {selectedPlan.isPublic ? (
                          <>
                            <Globe className="h-4 w-4 text-emerald-600" />
                            <span className="hidden lg:inline">Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 text-stone-500" />
                            <span className="hidden lg:inline">Privé</span>
                          </>
                        )}
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendar */}
        {selectedPlan ? (
          <WeeklyCalendar 
            plan={selectedPlan} 
            onRefresh={fetchPlans}
          />
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
        onSuccess={fetchPlans}
      />
      
      {selectedPlan && (
        <>
          <EditPlanDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            plan={selectedPlan}
            onUpdate={handleUpdatePlanName}
          />
          
          <ShoppingListDialog
            open={showShoppingList}
            onOpenChange={setShowShoppingList}
            plan={selectedPlan}
            onUpdate={fetchPlans}
          />
          
          <GenerateMenuDialog
            open={showGenerateMenu}
            onOpenChange={setShowGenerateMenu}
            planId={selectedPlan.id}
            onSuccess={fetchPlans}
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