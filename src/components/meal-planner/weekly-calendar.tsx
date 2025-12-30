"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ImageIcon, LayoutList, RefreshCcw, Flame } from "lucide-react";
import { MealCard } from "./meal-card";
import { AddMealDialog } from "./add-meal-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMoveMeal } from "@/hooks/use-meal-planner-query";
import { toast } from "@/components/ui/use-toast";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const DAY_COLORS: Record<string, { header: string; card: string; border: string; accent: string }> = {
  "Lundi": { header: "bg-slate-700 text-white", card: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-300 dark:border-slate-600", accent: "bg-slate-700" },
  "Mardi": { header: "bg-blue-800 text-white", card: "bg-blue-50 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-600", accent: "bg-blue-800" },
  "Mercredi": { header: "bg-violet-800 text-white", card: "bg-violet-50 dark:bg-violet-900/30", border: "border-violet-300 dark:border-violet-600", accent: "bg-violet-800" },
  "Jeudi": { header: "bg-purple-800 text-white", card: "bg-purple-50 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-600", accent: "bg-purple-800" },
  "Vendredi": { header: "bg-indigo-800 text-white", card: "bg-indigo-50 dark:bg-indigo-900/30", border: "border-indigo-300 dark:border-indigo-600", accent: "bg-indigo-800" },
  "Samedi": { header: "bg-emerald-800 text-white", card: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-300 dark:border-emerald-600", accent: "bg-emerald-800" },
  "Dimanche": { header: "bg-rose-800 text-white", card: "bg-rose-50 dark:bg-rose-900/30", border: "border-rose-300 dark:border-rose-600", accent: "bg-rose-800" },
};

const TIME_SLOTS = [
  { time: "08:00", label: "Petit-déj", fullLabel: "Petit-déjeuner", type: "Petit-déjeuner", emoji: "🥐" },
  { time: "12:00", label: "Déjeuner", fullLabel: "Déjeuner", type: "Déjeuner", emoji: "🍽️" },
  { time: "16:00", label: "Collation", fullLabel: "Collation", type: "Collation", emoji: "🍎" },
  { time: "19:00", label: "Dîner", fullLabel: "Dîner", type: "Dîner", emoji: "🌙" },
];

interface WeeklyCalendarProps {
  plan: any;
  onRefresh: () => void;
  readOnly?: boolean;
  canEdit?: boolean;
}

export function WeeklyCalendar({ plan, onRefresh, readOnly = false, canEdit = false }: WeeklyCalendarProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string; type: string } | null>(null);
  const [draggedMeal, setDraggedMeal] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [showImages, setShowImages] = useState(true); // Toggle pour afficher/masquer les images
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const moveMeal = useMoveMeal();

  const getMealForSlot = (day: string, timeSlot: string) => {
    return plan.meals?.find(
      (meal: any) => meal.dayOfWeek === day && meal.timeSlot === timeSlot
    );
  };

  const handleAddMeal = (day: string, time: string, type: string) => {
    setSelectedSlot({ day, time, type });
  };

  const handleDragStart = (e: React.DragEvent, meal: any) => {
    setDraggedMeal(meal);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDay: string, targetTime: string) => {
    e.preventDefault();
    
    if (!draggedMeal) return;
    
    // Ne rien faire si on dépose au même endroit
    if (draggedMeal.dayOfWeek === targetDay && draggedMeal.timeSlot === targetTime) {
      setDraggedMeal(null);
      return;
    }

    // Vérifier si le créneau cible est déjà occupé
    const targetMeal = getMealForSlot(targetDay, targetTime);
    if (targetMeal) {
      toast({
        title: "Créneau occupé",
        description: "Ce créneau est déjà occupé !",
        variant: "destructive",
      });
      setDraggedMeal(null);
      return;
    }

    moveMeal.mutate({
      mealId: draggedMeal.id,
      day: targetDay,
      mealType: targetTime,
    }, {
      onSuccess: () => {
        onRefresh();
        setDraggedMeal(null);
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Erreur lors du déplacement du repas",
          variant: "destructive",
        });
        setDraggedMeal(null);
      },
    });
  };

  const getDayMealCount = (day: string) => {
    return TIME_SLOTS.filter(slot => getMealForSlot(day, slot.time)).length;
  };

  // Calculer le total des calories pour un jour donné
  const getDayCalories = (day: string): number => {
    let total = 0;
    TIME_SLOTS.forEach(slot => {
      const meal = getMealForSlot(day, slot.time);
      if (meal && meal.calories) {
        // Gérer les différents formats de calories (nombre, objet, string)
        if (typeof meal.calories === 'number') {
          total += meal.calories;
        } else if (typeof meal.calories === 'object' && meal.calories !== null) {
          if ('value' in meal.calories) total += Number(meal.calories.value) || 0;
          else if ('amount' in meal.calories) total += Number(meal.calories.amount) || 0;
        } else if (typeof meal.calories === 'string') {
          total += parseFloat(meal.calories) || 0;
        }
      }
    });
    return Math.round(total);
  };

  const handleResetMenu = async () => {
    setIsResetting(true);
    try {
      // Supprimer tous les repas du plan
      const mealIds = plan.meals?.map((meal: any) => meal.id) || [];
      
      for (const mealId of mealIds) {
        const res = await fetch(`/api/meal-planner/meal/${mealId}`, {
          method: "DELETE",
        });
        
        if (!res.ok) {
          throw new Error("Erreur lors de la suppression d'un repas");
        }
      }
      
      // Rafraîchir le plan
      onRefresh();
      setShowResetDialog(false);
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error);
      alert("Erreur lors de la réinitialisation du menu");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      {/* Boutons de contrôle - DESKTOP UNIQUEMENT */}
      <div className="mb-4 hidden lg:flex lg:justify-end lg:gap-2">
        {/* Bouton de réinitialisation - Uniquement si l'utilisateur peut éditer ET qu'il y a des repas */}
        {canEdit && plan.meals && plan.meals.length > 0 && (
          <Button
            onClick={() => setShowResetDialog(true)}
            variant="outline"
            size="sm"
            className="gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <RefreshCcw className="h-4 w-4" />
            Réinitialiser le menu
          </Button>
        )}
        
        {/* Bouton Toggle pour afficher/masquer les images */}
        <Button
          onClick={() => setShowImages(!showImages)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {showImages ? (
            <>
              <LayoutList className="h-4 w-4" />
              Vue compacte
            </>
          ) : (
            <>
              <ImageIcon className="h-4 w-4" />
              Vue avec images
            </>
          )}
        </Button>
      </div>
      
      {/* Vue Desktop - Grille complète */}
      <div className="hidden lg:grid lg:grid-cols-8 gap-2 bg-white dark:bg-stone-800 rounded-lg shadow-lg p-4">
        {/* Header Row - Time Labels */}
        <div className="col-span-1 flex flex-col gap-2">
          <div className="h-12 flex items-center justify-center font-semibold text-sm text-stone-600 dark:text-stone-400">
            Horaire
          </div>
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot.time}
              className="h-32 flex flex-col items-center justify-center border rounded-lg bg-stone-50 dark:bg-stone-900 p-2"
            >
              <div className="text-2xl font-bold text-stone-700 dark:text-stone-300">{slot.time}</div>
              <div className="text-sm text-stone-600 dark:text-stone-400 text-center mt-1 font-medium">
                {slot.fullLabel}
              </div>
            </div>
          ))}
        </div>

        {/* Days Columns */}
        {DAYS.map((day) => {
          const colors = DAY_COLORS[day];
          const dayCalories = getDayCalories(day);
          return (
            <div key={day} className="flex flex-col gap-2">
              {/* Day Header */}
              <div className={`h-12 flex items-center justify-center gap-2 font-bold rounded-lg shadow-sm ${colors.header}`}>
                <span>{day}</span>
                {dayCalories > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-medium bg-white/20 px-1.5 py-0.5 rounded-full">
                    <Flame className="h-3 w-3" />
                    {dayCalories}
                  </span>
                )}
              </div>

              {/* Time Slots */}
              {TIME_SLOTS.map((slot) => {
                const meal = getMealForSlot(day, slot.time);
                
                return (
                  <div
                    key={`${day}-${slot.time}`}
                    className={`h-32 border-2 ${meal ? colors.border : 'border-dashed border-stone-200 dark:border-stone-700'} rounded-lg ${meal ? colors.card : ''} ${draggedMeal && !meal ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300' : ''} hover:border-emerald-300 dark:hover:border-emerald-600 transition-all relative group`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, slot.time)}
                  >
                    {meal ? (
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, meal)}
                        className="w-full h-full cursor-move"
                      >
                        <MealCard 
                          key={`${meal.id}-${showImages}`}
                          meal={meal} 
                          planId={plan.id}
                          onRefresh={onRefresh}
                          canEdit={canEdit}
                          showImages={showImages}
                        />
                      </div>
                    ) : (
                      !readOnly && canEdit && (
                        <button
                          onClick={() => handleAddMeal(day, slot.time, slot.type)}
                          className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-6 w-6 text-stone-400" />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Vue Mobile - Onglets par jour */}
      <div className="lg:hidden">
        <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
          {/* Navigation par onglets avec scroll horizontal */}
          <div className="sticky top-0 z-10 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 -mx-4 px-4 pb-2 mb-4">
            <TabsList className="w-full h-auto p-1 bg-stone-100 dark:bg-stone-800 grid grid-cols-7 gap-1">
              {DAYS.map((day, index) => {
                const colors = DAY_COLORS[day];
                const mealCount = getDayMealCount(day);
                const dayCalories = getDayCalories(day);
                return (
                  <TabsTrigger
                    key={day}
                    value={day}
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0 h-auto"
                  >
                    <div className={`flex flex-col items-center justify-center gap-0.5 w-full py-1.5 px-1 rounded-md ${selectedDay === day ? colors.header + ' shadow-md' : 'bg-white dark:bg-stone-700'} transition-all`}>
                      <span className={`text-[11px] font-bold ${selectedDay === day ? 'text-white' : 'text-stone-700 dark:text-stone-300'}`}>
                        {DAYS_SHORT[index]}
                      </span>
                      {mealCount > 0 && (
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${selectedDay === day ? 'bg-white/30 text-white' : colors.accent + ' text-white'}`}>
                          {mealCount}
                        </span>
                      )}
                      {dayCalories > 0 && (
                        <span className={`flex items-center gap-0.5 text-[8px] font-medium ${selectedDay === day ? 'text-white/80' : 'text-orange-600 dark:text-orange-400'}`}>
                          <Flame className="h-2 w-2" />
                          {dayCalories}
                        </span>
                      )}
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Contenu de chaque jour */}
          {DAYS.map((day) => {
            const colors = DAY_COLORS[day];
            
            return (
              <TabsContent key={day} value={day} className="mt-0 space-y-3">
                {TIME_SLOTS.map((slot) => {
                  const meal = getMealForSlot(day, slot.time);
                  
                  return (
                    <div
                      key={`${day}-${slot.time}`}
                      className={`rounded-lg border ${meal ? colors.border : 'border-dashed border-stone-300 dark:border-stone-600'} ${meal ? colors.card : 'bg-white dark:bg-stone-800'} overflow-hidden shadow-sm`}
                    >
                      {/* Header du créneau - ultra compact */}
                      <div className={`flex items-center justify-between px-3 py-2 ${meal ? colors.header : 'bg-stone-50 dark:bg-stone-700'}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`text-lg ${meal ? '' : 'opacity-60'}`}>{slot.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-sm ${meal ? 'text-white' : 'text-stone-800 dark:text-stone-200'}`}>
                              {slot.fullLabel} · {slot.time}
                            </div>
                          </div>
                        </div>
                        {!meal && !readOnly && canEdit && (
                          <Button
                            size="sm"
                            onClick={() => handleAddMeal(day, slot.time, slot.type)}
                            className={`${colors.accent} text-white hover:opacity-90 h-8 px-2 text-xs`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Ajouter
                          </Button>
                        )}
                      </div>

                      {/* Contenu du repas */}
                      {meal && (
                        <div className="p-2">
                          <MealCard 
                            key={`${meal.id}-mobile`}
                            meal={meal} 
                            planId={plan.id}
                            onRefresh={onRefresh}
                            canEdit={canEdit}
                            showImages={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Add Meal Dialog */}
      {selectedSlot && (
        <AddMealDialog
          open={!!selectedSlot}
          onOpenChange={(open) => !open && setSelectedSlot(null)}
          planId={plan.id}
          slots={[{ day: selectedSlot.day, time: selectedSlot.time, type: selectedSlot.type }]}
          onSuccess={() => {
            onRefresh();
            setSelectedSlot(null);
          }}
        />
      )}

      {/* Dialog de confirmation de réinitialisation */}
      <ConfirmDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleResetMenu}
        title="Réinitialiser le menu"
        description={
          <div className="space-y-3">
            <p className="text-stone-600 dark:text-stone-400">
              Êtes-vous sûr de vouloir réinitialiser ce menu ?
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                ⚠️ Attention : Cette action est irréversible
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Tous les repas de ce menu ({plan.meals?.length || 0} repas) seront définitivement supprimés.
              </p>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Le menu sera vide et vous pourrez recommencer à zéro.
            </p>
          </div>
        }
        confirmLabel="Oui, réinitialiser"
        cancelLabel="Annuler"
        isLoading={isResetting}
        variant="destructive"
      />
    </>
  );
}