"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MealCard } from "./meal-card";
import { AddMealDialog } from "./add-meal-dialog";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const DAY_COLORS: Record<string, { header: string; card: string; border: string }> = {
  "Lundi": { header: "bg-slate-700 text-white", card: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-300 dark:border-slate-600" },
  "Mardi": { header: "bg-indigo-700 text-white", card: "bg-indigo-50 dark:bg-indigo-900/30", border: "border-indigo-300 dark:border-indigo-600" },
  "Mercredi": { header: "bg-violet-700 text-white", card: "bg-violet-50 dark:bg-violet-900/30", border: "border-violet-300 dark:border-violet-600" },
  "Jeudi": { header: "bg-amber-700 text-white", card: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-600" },
  "Vendredi": { header: "bg-orange-700 text-white", card: "bg-orange-50 dark:bg-orange-900/30", border: "border-orange-300 dark:border-orange-600" },
  "Samedi": { header: "bg-emerald-700 text-white", card: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-300 dark:border-emerald-600" },
  "Dimanche": { header: "bg-rose-700 text-white", card: "bg-rose-50 dark:bg-rose-900/30", border: "border-rose-300 dark:border-rose-600" },
};

const TIME_SLOTS = [
  { time: "08:00", label: "Petit-déjeuner", type: "Petit-déjeuner" },
  { time: "12:00", label: "Déjeuner", type: "Déjeuner" },
  { time: "16:00", label: "Collation", type: "Collation" },
  { time: "19:00", label: "Dîner", type: "Dîner" },
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

  return (
    <>
      {/* Vue Desktop - Grille complète (caché sur mobile) */}
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
                {slot.label}
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

      {/* Vue Mobile - Liste par jour (visible uniquement sur mobile) */}
      <div className="lg:hidden space-y-4">
        {DAYS.map((day) => {
          const colors = DAY_COLORS[day];
          const dayMeals = TIME_SLOTS.map(slot => ({
            slot,
            meal: getMealForSlot(day, slot.time)
          }));
          const hasMeals = dayMeals.some(dm => dm.meal);

          return (
            <div key={day} className="bg-white dark:bg-stone-800 rounded-xl shadow-md overflow-hidden">
              {/* Header du jour */}
              <div className={`p-4 ${colors.header} flex items-center justify-between`}>
                <h3 className="text-lg font-bold">{day}</h3>
                {hasMeals && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {dayMeals.filter(dm => dm.meal).length} repas
                  </span>
                )}
              </div>

              {/* Créneaux horaires */}
              <div className="p-3 space-y-3">
                {TIME_SLOTS.map((slot) => {
                  const meal = getMealForSlot(day, slot.time);
                  
                  return (
                    <div key={`${day}-${slot.time}`} className="space-y-2">
                      {/* Label du créneau */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-stone-700 dark:text-stone-300 min-w-[60px]">
                          {slot.time}
                        </span>
                        <span className="text-stone-500 dark:text-stone-400">
                          {slot.label}
                        </span>
                      </div>

                      {/* Repas ou bouton d'ajout */}
                      {meal ? (
                        <div className={`border-2 ${colors.border} ${colors.card} rounded-lg p-3`}>
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
                            className="w-full border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-lg p-4 flex items-center justify-center gap-2 text-stone-500 dark:text-stone-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            <Plus className="h-5 w-5" />
                            <span className="text-sm font-medium">Ajouter un repas</span>
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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