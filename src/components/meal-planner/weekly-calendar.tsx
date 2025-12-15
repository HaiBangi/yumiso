"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { MealCard } from "./meal-card";
import { AddMealDialog } from "./add-meal-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const DAY_COLORS: Record<string, { header: string; card: string; border: string; accent: string }> = {
  "Lundi": { header: "bg-slate-700 text-white", card: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-300 dark:border-slate-600", accent: "bg-slate-500" },
  "Mardi": { header: "bg-indigo-700 text-white", card: "bg-indigo-50 dark:bg-indigo-900/30", border: "border-indigo-300 dark:border-indigo-600", accent: "bg-indigo-500" },
  "Mercredi": { header: "bg-violet-700 text-white", card: "bg-violet-50 dark:bg-violet-900/30", border: "border-violet-300 dark:border-violet-600", accent: "bg-violet-500" },
  "Jeudi": { header: "bg-amber-700 text-white", card: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-600", accent: "bg-amber-500" },
  "Vendredi": { header: "bg-orange-700 text-white", card: "bg-orange-50 dark:bg-orange-900/30", border: "border-orange-300 dark:border-orange-600", accent: "bg-orange-500" },
  "Samedi": { header: "bg-emerald-700 text-white", card: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-300 dark:border-emerald-600", accent: "bg-emerald-500" },
  "Dimanche": { header: "bg-rose-700 text-white", card: "bg-rose-50 dark:bg-rose-900/30", border: "border-rose-300 dark:border-rose-600", accent: "bg-rose-500" },
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
      alert("Ce créneau est déjà occupé !");
      setDraggedMeal(null);
      return;
    }

    try {
      // Mettre à jour le repas avec le nouveau créneau
      const res = await fetch(`/api/meal-planner/meal/${draggedMeal.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: targetDay,
          timeSlot: targetTime,
        }),
      });

      if (res.ok) {
        onRefresh();
      } else {
        alert("Erreur lors du déplacement du repas");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors du déplacement du repas");
    } finally {
      setDraggedMeal(null);
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const currentIndex = DAYS.indexOf(selectedDay);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedDay(DAYS[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < DAYS.length - 1) {
      setSelectedDay(DAYS[currentIndex + 1]);
    }
  };

  const getDayMealCount = (day: string) => {
    return TIME_SLOTS.filter(slot => getMealForSlot(day, slot.time)).length;
  };

  return (
    <>
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
          return (
            <div key={day} className="flex flex-col gap-2">
              {/* Day Header */}
              <div className={`h-12 flex items-center justify-center font-bold rounded-lg shadow-sm ${colors.header}`}>
                {day}
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
                          meal={meal} 
                          planId={plan.id}
                          onRefresh={onRefresh}
                          canEdit={canEdit}
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

      {/* Vue Mobile - Onglets ultra-compacts par jour */}
      <div className="lg:hidden">
        <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
          {/* Navigation par onglets avec scroll horizontal */}
          <div className="sticky top-0 z-10 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 pb-3 -mx-4 px-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDay('prev')}
                disabled={DAYS.indexOf(selectedDay) === 0}
                className="flex-shrink-0 h-9 w-9 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <TabsList className="flex-1 h-auto p-1 bg-white dark:bg-stone-800 overflow-x-auto scrollbar-hide">
                {DAYS.map((day, index) => {
                  const colors = DAY_COLORS[day];
                  const mealCount = getDayMealCount(day);
                  return (
                    <TabsTrigger
                      key={day}
                      value={day}
                      className="flex-shrink-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none relative px-2 py-1.5"
                    >
                      <div className={`flex flex-col items-center gap-0.5 ${selectedDay === day ? colors.header : ''} ${selectedDay === day ? 'px-3 py-1.5 rounded-lg' : ''} transition-all`}>
                        <span className={`text-xs font-semibold ${selectedDay === day ? '' : 'text-stone-600 dark:text-stone-400'}`}>
                          {DAYS_SHORT[index]}
                        </span>
                        {mealCount > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedDay === day ? 'bg-white/30' : colors.accent + ' text-white'}`}>
                            {mealCount}
                          </span>
                        )}
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDay('next')}
                disabled={DAYS.indexOf(selectedDay) === DAYS.length - 1}
                className="flex-shrink-0 h-9 w-9 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Contenu de chaque jour */}
          {DAYS.map((day) => {
            const colors = DAY_COLORS[day];
            return (
              <TabsContent key={day} value={day} className="mt-0 space-y-2">
                {TIME_SLOTS.map((slot) => {
                  const meal = getMealForSlot(day, slot.time);
                  
                  return (
                    <div
                      key={`${day}-${slot.time}`}
                      className={`rounded-xl border-2 ${meal ? colors.border : 'border-dashed border-stone-200 dark:border-stone-700'} ${meal ? colors.card : 'bg-white dark:bg-stone-800'} overflow-hidden transition-all`}
                    >
                      {/* Header du créneau */}
                      <div className={`flex items-center justify-between px-3 py-2 ${meal ? colors.header : 'bg-stone-100 dark:bg-stone-700'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${meal ? '' : 'opacity-70'}`}>{slot.emoji}</span>
                          <div>
                            <div className={`font-semibold text-sm ${meal ? '' : 'text-stone-700 dark:text-stone-300'}`}>
                              {slot.fullLabel}
                            </div>
                            <div className={`text-xs ${meal ? 'text-white/80' : 'text-stone-500 dark:text-stone-400'}`}>
                              {slot.time}
                            </div>
                          </div>
                        </div>
                        {!meal && !readOnly && canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddMeal(day, slot.time, slot.type)}
                            className="h-8 w-8 p-0 hover:bg-white/20"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Contenu du repas */}
                      {meal ? (
                        <div className="p-2">
                          <MealCard 
                            meal={meal} 
                            planId={plan.id}
                            onRefresh={onRefresh}
                            canEdit={canEdit}
                          />
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-sm text-stone-400 dark:text-stone-500">
                            Aucun repas planifié
                          </p>
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
          day={selectedSlot.day}
          timeSlot={selectedSlot.time}
          mealType={selectedSlot.type}
          onSuccess={() => {
            onRefresh();
            setSelectedSlot(null);
          }}
        />
      )}
    </>
  );
}