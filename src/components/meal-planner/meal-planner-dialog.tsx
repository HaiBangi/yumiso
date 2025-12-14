"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Users,
  ChefHat,
  Clock,
  Wallet,
  Sparkles,
  Loader2,
  ShoppingCart,
  Lightbulb,
  Download,
  Check,
  Apple,
  Utensils,
  Pizza,
  Coffee,
} from "lucide-react";

interface MealPlannerProps {
  trigger?: React.ReactNode;
}

interface Meal {
  type: string;
  name: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  calories: number;
  ingredients: string[];
  steps: string[];
  isUserRecipe: boolean;
}

interface DayPlan {
  day: string;
  meals: Meal[];
}

interface MenuPlan {
  weekPlan: DayPlan[];
  shoppingList: Record<string, string[]>;
  prepTips: string[];
  estimatedCost: string;
  nutritionSummary: {
    avgCaloriesPerDay: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
}

const dietaryOptions = [
  { id: "vegetarien", label: "Végétarien", emoji: "🥗" },
  { id: "vegan", label: "Végan", emoji: "🌱" },
  { id: "sans-gluten", label: "Sans gluten", emoji: "🌾" },
  { id: "sans-lactose", label: "Sans lactose", emoji: "🥛" },
  { id: "halal", label: "Halal", emoji: "☪️" },
  { id: "casher", label: "Casher", emoji: "✡️" },
];

const budgetOptions = [
  { value: "economique", label: "Économique", emoji: "💰", description: "< 40€/semaine" },
  { value: "moyen", label: "Moyen", emoji: "💵", description: "40-70€/semaine" },
  { value: "confort", label: "Confort", emoji: "💳", description: "> 70€/semaine" },
];

const timeOptions = [
  { value: "rapide", label: "Rapide", emoji: "⚡", description: "< 30 min" },
  { value: "moyen", label: "Modéré", emoji: "⏱️", description: "30-60 min" },
  { value: "elabore", label: "Élaboré", emoji: "👨‍🍳", description: "> 60 min" },
];

const mealTypeOptions = [
  { id: "petit-dejeuner", label: "Petit-déjeuner", icon: Coffee },
  { id: "dejeuner", label: "Déjeuner", icon: Utensils },
  { id: "diner", label: "Dîner", icon: Pizza },
  { id: "collation", label: "Collations", icon: Apple },
];

const cuisineOptions = [
  "Française", "Italienne", "Asiatique", "Méditerranéenne", 
  "Mexicaine", "Indienne", "Japonaise", "Libanaise"
];

export function MealPlanner({ trigger }: MealPlannerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [menuPlan, setMenuPlan] = useState<MenuPlan | null>(null);

  // Form state
  const [numberOfPeople, setNumberOfPeople] = useState("2");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [budget, setBudget] = useState("moyen");
  const [cookingTime, setCookingTime] = useState("moyen");
  const [mealTypes, setMealTypes] = useState<string[]>(["dejeuner", "diner"]);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [useMyRecipes, setUseMyRecipes] = useState(true);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/meal-planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numberOfPeople: parseInt(numberOfPeople),
          dietaryRestrictions,
          allergies: allergies.split(",").map(a => a.trim()).filter(Boolean),
          budget,
          cookingTime,
          mealTypes,
          cuisinePreferences,
          useMyRecipes,
        }),
      });

      if (!response.ok) throw new Error("Erreur lors de la génération");

      const data = await response.json();
      setMenuPlan(data);
      setStep('result');
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la génération du menu. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    // TODO: Implement PDF export
    alert("Export PDF en cours de développement");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setStep('form');
        setMenuPlan(null);
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start gap-2">
            <CalendarDays className="h-4 w-4" />
            Planificateur de menus
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0">
        {step === 'form' ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <ChefHat className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                    Générateur de Menu Hebdomadaire
                  </DialogTitle>
                  <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                    Créez votre planning de repas personnalisé en quelques clics ✨
                  </p>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6 py-6">
              <div className="space-y-6">
                {/* Nombre de personnes */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Pour combien de personnes ?
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={numberOfPeople}
                    onChange={(e) => setNumberOfPeople(e.target.value)}
                    className="text-lg font-semibold"
                  />
                </div>

                <Separator />

                {/* Types de repas */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-emerald-600" />
                    Quels repas souhaitez-vous planifier ?
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {mealTypeOptions.map((meal) => {
                      const Icon = meal.icon;
                      return (
                        <Button
                          key={meal.id}
                          type="button"
                          variant={mealTypes.includes(meal.id) ? "default" : "outline"}
                          className={`h-auto py-3 justify-start ${
                            mealTypes.includes(meal.id)
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : ""
                          }`}
                          onClick={() => {
                            if (mealTypes.includes(meal.id)) {
                              setMealTypes(mealTypes.filter(m => m !== meal.id));
                            } else {
                              setMealTypes([...mealTypes, meal.id]);
                            }
                          }}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {meal.label}
                          {mealTypes.includes(meal.id) && (
                            <Check className="h-4 w-4 ml-auto" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Budget */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    Quel est votre budget ?
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {budgetOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={budget === option.value ? "default" : "outline"}
                        className={`h-auto py-4 flex-col items-start ${
                          budget === option.value
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : ""
                        }`}
                        onClick={() => setBudget(option.value)}
                      >
                        <div className="text-2xl mb-1">{option.emoji}</div>
                        <div className="font-semibold">{option.label}</div>
                        <div className="text-xs opacity-80">{option.description}</div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Temps de cuisine */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Temps de cuisine disponible
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {timeOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={cookingTime === option.value ? "default" : "outline"}
                        className={`h-auto py-4 flex-col items-start ${
                          cookingTime === option.value
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : ""
                        }`}
                        onClick={() => setCookingTime(option.value)}
                      >
                        <div className="text-2xl mb-1">{option.emoji}</div>
                        <div className="font-semibold">{option.label}</div>
                        <div className="text-xs opacity-80">{option.description}</div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Restrictions alimentaires */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Restrictions alimentaires (optionnel)
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {dietaryOptions.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                      >
                        <Checkbox
                          checked={dietaryRestrictions.includes(option.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setDietaryRestrictions([...dietaryRestrictions, option.id]);
                            } else {
                              setDietaryRestrictions(dietaryRestrictions.filter(d => d !== option.id));
                            }
                          }}
                        />
                        <span className="text-sm">
                          {option.emoji} {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Allergies */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Allergies (optionnel)
                  </Label>
                  <Input
                    placeholder="Ex: arachides, fruits de mer, œufs..."
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                  />
                  <p className="text-xs text-stone-500">Séparez par des virgules</p>
                </div>

                <Separator />

                {/* Préférences culinaires */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    Préférences culinaires (optionnel)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {cuisineOptions.map((cuisine) => (
                      <Badge
                        key={cuisine}
                        variant={cuisinePreferences.includes(cuisine) ? "default" : "outline"}
                        className={`cursor-pointer ${
                          cuisinePreferences.includes(cuisine)
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : ""
                        }`}
                        onClick={() => {
                          if (cuisinePreferences.includes(cuisine)) {
                            setCuisinePreferences(cuisinePreferences.filter(c => c !== cuisine));
                          } else {
                            setCuisinePreferences([...cuisinePreferences, cuisine]);
                          }
                        }}
                      >
                        {cuisine}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Utiliser mes recettes */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 cursor-pointer">
                    <Checkbox
                      checked={useMyRecipes}
                      onCheckedChange={(checked) => setUseMyRecipes(checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        Utiliser mes recettes personnelles
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                        Le planificateur privilégiera vos recettes sauvegardées
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </ScrollArea>

            <div className="px-6 py-4 border-t bg-stone-50 dark:bg-stone-900/50">
              <Button
                onClick={handleGenerate}
                disabled={isLoading || mealTypes.length === 0}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Génération de votre menu...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Générer mon menu de la semaine
                  </>
                )}
              </Button>
            </div>
          </>
        ) : menuPlan ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      Votre Menu de la Semaine
                    </DialogTitle>
                    <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                      Planning pour {numberOfPeople} personne{parseInt(numberOfPeople) > 1 ? 's' : ''} • {menuPlan.estimatedCost}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('form')}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToPDF}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6 py-6">
              <div className="space-y-6">
                {/* Résumé nutritionnel */}
                <div className="grid grid-cols-4 gap-4 p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {menuPlan.nutritionSummary.avgCaloriesPerDay}
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-400">kcal/jour</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {menuPlan.nutritionSummary.proteinGrams}g
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-400">Protéines</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {menuPlan.nutritionSummary.carbsGrams}g
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-400">Glucides</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {menuPlan.nutritionSummary.fatGrams}g
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-400">Lipides</div>
                  </div>
                </div>

                {/* Planning hebdomadaire */}
                {menuPlan.weekPlan.map((dayPlan, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                        {dayPlan.day}
                      </h3>
                    </div>
                    <div className="grid gap-3">
                      {dayPlan.meals.map((meal, mealIndex) => (
                        <div
                          key={mealIndex}
                          className="p-4 rounded-lg border bg-white dark:bg-stone-900 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {meal.type}
                                </Badge>
                                {meal.isUserRecipe && (
                                  <Badge className="bg-emerald-600 text-xs">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Ma recette
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                                {meal.name}
                              </h4>
                            </div>
                            <div className="text-right text-xs text-stone-500">
                              <div>⏱️ {meal.prepTime + meal.cookTime} min</div>
                              <div>🔥 {meal.calories} kcal</div>
                            </div>
                          </div>
                          
                          <details className="mt-3 text-sm">
                            <summary className="cursor-pointer font-medium text-emerald-600 hover:text-emerald-700">
                              Voir la recette
                            </summary>
                            <div className="mt-3 space-y-2">
                              <div>
                                <p className="font-medium text-xs text-stone-600 dark:text-stone-400 mb-1">
                                  Ingrédients :
                                </p>
                                <ul className="list-disc list-inside text-xs space-y-1 text-stone-700 dark:text-stone-300">
                                  {meal.ingredients.map((ing, i) => (
                                    <li key={i}>{ing}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="font-medium text-xs text-stone-600 dark:text-stone-400 mb-1">
                                  Étapes :
                                </p>
                                <ol className="list-decimal list-inside text-xs space-y-1 text-stone-700 dark:text-stone-300">
                                  {meal.steps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Separator />

                {/* Liste de courses */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                      Liste de Courses
                    </h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(menuPlan.shoppingList).map(([category, items]) => (
                      <div key={category} className="p-4 rounded-lg border bg-stone-50 dark:bg-stone-900/50">
                        <h4 className="font-semibold text-sm mb-2 text-stone-900 dark:text-stone-100">
                          {category}
                        </h4>
                        <ul className="space-y-1">
                          {items.map((item, i) => (
                            <li key={i} className="text-xs text-stone-600 dark:text-stone-400 flex items-start gap-2">
                              <Check className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Conseils pratiques */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-600" />
                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                      Conseils Pratiques
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {menuPlan.prepTips.map((tip, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                      >
                        <p className="text-sm text-stone-700 dark:text-stone-300">
                          💡 {tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
