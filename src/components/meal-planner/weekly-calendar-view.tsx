"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  ExternalLink, 
  Loader2,
  ChefHat,
  CalendarDays 
} from "lucide-react";
import Link from "next/link";

interface WeeklyCalendarViewProps {
  savedPlans: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const DAYS_OF_WEEK = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function WeeklyCalendarView({ savedPlans, isLoading }: WeeklyCalendarViewProps) {
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (savedPlans.length === 0) {
    return (
      <div className="text-center py-20">
        <CalendarDays className="h-20 w-20 mx-auto text-stone-300 dark:text-stone-700 mb-4" />
        <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Aucun menu sauvegardé
        </h3>
        <p className="text-stone-600 dark:text-stone-400 mb-6">
          Commencez par générer votre premier menu de la semaine
        </p>
      </div>
    );
  }

  // Prendre le dernier plan sauvegardé par défaut
  const currentPlan = selectedPlan || savedPlans[0];

  // Organiser les repas par jour
  const mealsByDay: Record<string, any[]> = {};
  DAYS_OF_WEEK.forEach(day => {
    mealsByDay[day] = currentPlan.meals.filter((meal: any) => meal.dayOfWeek === day);
  });

  return (
    <div className="space-y-6">
      {/* Sélecteur de semaine */}
      {savedPlans.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {savedPlans.map((plan) => (
            <Button
              key={plan.id}
              variant={currentPlan.id === plan.id ? "default" : "outline"}
              onClick={() => setSelectedPlan(plan)}
              className={currentPlan.id === plan.id ? "bg-emerald-600" : ""}
            >
              {plan.name}
            </Button>
          ))}
        </div>
      )}

      {/* En-tête du planning */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {currentPlan.name}
            </h2>
            <p className="text-stone-600 dark:text-stone-400 mt-1">
              {currentPlan.numberOfPeople} personne{currentPlan.numberOfPeople > 1 ? 's' : ''} • {currentPlan.estimatedCost}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{currentPlan.budget}</Badge>
            <Badge variant="outline">{currentPlan.cookingTime}</Badge>
          </div>
        </div>

        {/* Résumé nutritionnel */}
        {currentPlan.avgCaloriesPerDay && (
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {currentPlan.avgCaloriesPerDay}
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-400">kcal/jour</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentPlan.proteinGrams}g
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-400">Protéines</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {currentPlan.carbsGrams}g
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-400">Glucides</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {currentPlan.fatGrams}g
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-400">Lipides</div>
            </div>
          </div>
        )}
      </Card>

      {/* Calendrier hebdomadaire */}
      <div className="grid gap-4">
        {DAYS_OF_WEEK.map((day) => (
          <Card key={day} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {day}
              </h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {mealsByDay[day]?.map((meal: any) => (
                <div
                  key={meal.id}
                  onClick={() => setSelectedMeal(meal)}
                  className="p-4 rounded-lg border bg-white dark:bg-stone-800 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {meal.mealType}
                    </Badge>
                    {meal.isUserRecipe && (
                      <Badge className="bg-emerald-600 text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Ma recette
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-2 line-clamp-2">
                    {meal.name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {meal.prepTime + meal.cookTime} min
                    </div>
                    {meal.calories && (
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {meal.calories} kcal
                      </div>
                    )}
                  </div>
                  {meal.recipe && (
                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Voir la recette complète
                    </div>
                  )}
                </div>
              ))}
            </div>
            {(!mealsByDay[day] || mealsByDay[day].length === 0) && (
              <p className="text-stone-400 dark:text-stone-600 text-sm italic">
                Aucun repas prévu ce jour
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Dialog de détails du repas */}
      <Dialog open={!!selectedMeal} onOpenChange={(open) => !open && setSelectedMeal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedMeal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedMeal.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{selectedMeal.mealType}</Badge>
                  {selectedMeal.isUserRecipe && (
                    <Badge className="bg-emerald-600">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Ma recette
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Infos */}
                <div className="flex items-center gap-4 text-sm text-stone-600 dark:text-stone-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Préparation: {selectedMeal.prepTime} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Cuisson: {selectedMeal.cookTime} min
                  </div>
                  {selectedMeal.calories && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      {selectedMeal.calories} kcal
                    </div>
                  )}
                </div>

                {/* Lien vers la recette complète si disponible */}
                {selectedMeal.recipeId && (
                  <Link href={`/recipes/${selectedMeal.recipeId}`}>
                    <Button className="w-full" variant="outline">
                      <ChefHat className="h-4 w-4 mr-2" />
                      Voir la recette complète
                    </Button>
                  </Link>
                )}

                {/* Ingrédients */}
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">
                    Ingrédients
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-stone-600 dark:text-stone-400">
                    {Array.isArray(selectedMeal.ingredients) && selectedMeal.ingredients.map((ing: string, i: number) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </div>

                {/* Étapes */}
                {/* Étapes */}
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">
                    Étapes de préparation
                  </h4>
                  <ol className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
                    {Array.isArray(selectedMeal.steps) && selectedMeal.steps.map((step: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0">
                          {i + 1}.
                        </span>
                        <div className="flex-1">
                          {step.split('\n').map((line: string, lineIdx: number) => {
                            const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
                            const indentLevel = Math.floor(leadingSpaces / 2);
                            const trimmedLine = line.trim();
                            const isBulletPoint = trimmedLine.startsWith('-');

                            if (!isBulletPoint) {
                              return (
                                <div key={lineIdx}>
                                  {line}
                                  {lineIdx < step.split('\n').length - 1 && line.trim() !== '' && <br />}
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={lineIdx} 
                                className="flex items-start gap-2 my-1"
                                style={{ marginLeft: indentLevel > 0 ? `${indentLevel * 1.5}rem` : '0' }}
                              >
                                <span className={`mt-1.5 flex-shrink-0 ${
                                  indentLevel > 0 ? 'h-1 w-1' : 'h-1.5 w-1.5'
                                } rounded-full ${
                                  indentLevel > 0 
                                    ? 'bg-emerald-300 dark:bg-emerald-700' 
                                    : 'bg-emerald-400 dark:bg-emerald-600'
                                }`} />
                                <span className="flex-1">{trimmedLine.replace(/^-\s*/, '')}</span>
                              </div>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
