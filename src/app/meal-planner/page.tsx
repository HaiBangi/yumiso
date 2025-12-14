"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, ShoppingCart, Sparkles } from "lucide-react";
import { WeeklyCalendar } from "@/components/meal-planner/weekly-calendar";
import { MealPlannerDialog } from "@/components/meal-planner/meal-planner-dialog-new";
import { EditPlanDialog } from "@/components/meal-planner/edit-plan-dialog";
import { ShoppingListDialog } from "@/components/meal-planner/shopping-list-dialog";
import { GenerateMenuDialog } from "@/components/meal-planner/generate-menu-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function MealPlannerPage() {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showGenerateMenu, setShowGenerateMenu] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/meal-planner/saved");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        if (data.length > 0 && !selectedPlanId) {
          setSelectedPlanId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des plans:", error);
    } finally {
      setIsLoading(false);
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
          setSelectedPlanId(plans[0]?.id || null);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setIsDeleting(false);
      setPlanToDelete(null);
    }
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

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Veuillez vous connecter pour accéder au planificateur de menus.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
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
              {selectedPlan && (
                <>
                  <Button 
                    onClick={() => setShowGenerateMenu(true)}
                    variant="outline"
                    className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Générer Menu</span>
                    <span className="sm:hidden">Générer</span>
                  </Button>
                  <Button 
                    onClick={() => setShowShoppingList(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden sm:inline">Liste de Courses</span>
                    <span className="sm:hidden">Courses</span>
                  </Button>
                </>
              )}
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

        {/* Plans List - Scroll horizontal sur mobile */}
        <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border-2 transition-all cursor-pointer flex-shrink-0 ${
                  selectedPlanId === plan.id
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30"
                    : "border-stone-200 dark:border-stone-700 hover:border-emerald-300"
                }`}
                onClick={() => setSelectedPlanId(plan.id)}
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