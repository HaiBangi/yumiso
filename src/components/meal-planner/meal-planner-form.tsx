"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

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

interface MealPlannerFormProps {
  onSuccess?: () => void;
}

export function MealPlannerForm({ onSuccess }: MealPlannerFormProps = {}) {
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Appeler le callback de succès si fourni
      if (onSuccess) {
        onSuccess();
      }
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

  if (step === 'result' && menuPlan) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header avec retour */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setStep('form')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au formulaire
          </Button>
          
          <div className="flex items-center justify-between flex-wrap gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
                  Votre Menu de la Semaine
                </h1>
                <p className="text-stone-600 dark:text-stone-400 mt-1">
                  Planning pour {numberOfPeople} personne{parseInt(numberOfPeople) > 1 ? 's' : ''} • {menuPlan.estimatedCost}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('form')}
              >
                Modifier
              </Button>
              <Button
                variant="outline"
                onClick={exportToPDF}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Résumé nutritionnel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">
                {menuPlan.nutritionSummary.avgCaloriesPerDay}
              </div>
              <div className="text-sm text-stone-600 dark:text-stone-400 mt-1">kcal/jour</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {menuPlan.nutritionSummary.proteinGrams}g
              </div>
              <div className="text-sm text-stone-600 dark:text-stone-400 mt-1">Protéines</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600">
                {menuPlan.nutritionSummary.carbsGrams}g
              </div>
              <div className="text-sm text-stone-600 dark:text-stone-400 mt-1">Glucides</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {menuPlan.nutritionSummary.fatGrams}g
              </div>
              <div className="text-sm text-stone-600 dark:text-stone-400 mt-1">Lipides</div>
            </div>
          </div>

          {/* Planning hebdomadaire */}
          {menuPlan.weekPlan.map((dayPlan, index) => (
            <div key={index} className="space-y-4">
              <div className="flex items-center gap-3 sticky top-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 py-3 z-10">
                <CalendarDays className="h-6 w-6 text-emerald-600" />
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {dayPlan.day}
                </h2>
              </div>
              <div className="grid gap-4">
                {dayPlan.meals.map((meal, mealIndex) => (
                  <div
                    key={mealIndex}
                    className="p-6 rounded-xl border bg-white dark:bg-stone-800 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
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
                        <h3 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
                          {meal.name}
                        </h3>
                      </div>
                      <div className="text-right text-sm text-stone-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {meal.prepTime + meal.cookTime} min
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Sparkles className="h-4 w-4" />
                          {meal.calories} kcal
                        </div>
                      </div>
                    </div>
                    
                    <details className="mt-4">
                      <summary className="cursor-pointer font-medium text-emerald-600 hover:text-emerald-700 text-base">
                        📋 Voir la recette complète
                      </summary>
                      <div className="mt-4 space-y-4 pl-4 border-l-2 border-emerald-200 dark:border-emerald-800">
                        <div>
                          <p className="font-semibold text-sm text-stone-700 dark:text-stone-300 mb-2">
                            Ingrédients :
                          </p>
                          <ul className="list-disc list-inside text-sm space-y-1 text-stone-600 dark:text-stone-400">
                            {meal.ingredients.map((ing, i) => (
                              <li key={i}>{ing}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-stone-700 dark:text-stone-300 mb-2">
                            Étapes :
                          </p>
                          <ol className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
                            {meal.steps.map((step, i) => (
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
                    </details>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Separator className="my-8" />

          {/* Liste de courses */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                Liste de Courses
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(menuPlan.shoppingList).map(([category, items]) => (
                <div key={category} className="p-5 rounded-xl border bg-white dark:bg-stone-800 shadow-sm">
                  <h3 className="font-bold text-base mb-3 text-stone-900 dark:text-stone-100">
                    {category}
                  </h3>
                  <ul className="space-y-2">
                    {items.map((item, i) => (
                      <li key={i} className="text-sm text-stone-600 dark:text-stone-400 flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-8" />

          {/* Conseils pratiques */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-6 w-6 text-amber-600" />
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                Conseils Pratiques
              </h2>
            </div>
            <div className="grid gap-3">
              {menuPlan.prepTips.map((tip, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                >
                  <p className="text-sm text-stone-700 dark:text-stone-300">
                    💡 {tip}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/recipes">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux recettes
          </Button>
        </Link>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 mb-4">
            <ChefHat className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            Générateur de Menu Hebdomadaire
          </h1>
          <p className="text-stone-600 dark:text-stone-400">
            Créez votre planning de repas personnalisé en quelques clics ✨
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-8">
        {/* Nombre de personnes */}
        <div className="space-y-3 p-6 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Pour combien de personnes ?
          </Label>
          <Input
            type="number"
            min="1"
            max="12"
            value={numberOfPeople}
            onChange={(e) => setNumberOfPeople(e.target.value)}
            className="text-xl font-semibold h-14"
          />
        </div>

        {/* Types de repas */}
        <div className="space-y-3 p-6 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Utensils className="h-5 w-5 text-emerald-600" />
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
                  className={`h-auto py-4 justify-start text-base ${
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
                  <Icon className="h-5 w-5 mr-2" />
                  {meal.label}
                  {mealTypes.includes(meal.id) && (
                    <Check className="h-5 w-5 ml-auto" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-3 p-6 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Quel est votre budget ?
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {budgetOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={budget === option.value ? "default" : "outline"}
                className={`h-auto py-6 flex-col items-center ${
                  budget === option.value
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : ""
                }`}
                onClick={() => setBudget(option.value)}
              >
                <div className="text-3xl mb-2">{option.emoji}</div>
                <div className="font-semibold text-base">{option.label}</div>
                <div className="text-xs opacity-80 mt-1">{option.description}</div>
              </Button>
            ))}
          </div>
        </div>

        {/* Temps de cuisine */}
        <div className="space-y-3 p-6 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            Temps de cuisine disponible
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {timeOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={cookingTime === option.value ? "default" : "outline"}
                className={`h-auto py-6 flex-col items-center ${
                  cookingTime === option.value
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : ""
                }`}
                onClick={() => setCookingTime(option.value)}
              >
                <div className="text-3xl mb-2">{option.emoji}</div>
                <div className="font-semibold text-base">{option.label}</div>
                <div className="text-xs opacity-80 mt-1">{option.description}</div>
              </Button>
            ))}
          </div>
        </div>

        {/* Restrictions alimentaires */}
        <div className="space-y-3 p-6 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm">
          <Label className="text-lg font-semibold">
            Restrictions alimentaires (optionnel)
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dietaryOptions.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
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
                <span className="text-sm font-medium">
                  {option.emoji} {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div className="space-y-3 p-6 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm">
          <Label className="text-lg font-semibold">
            Allergies (optionnel)
          </Label>
          <Input
            placeholder="Ex: arachides, fruits de mer, œufs..."
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            className="h-12"
          />
          <p className="text-sm text-stone-500">Séparez par des virgules</p>
        </div>

        {/* Préférences culinaires */}
        <div className="space-y-3 p-6 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm">
          <Label className="text-lg font-semibold">
            Préférences culinaires (optionnel)
          </Label>
          <div className="flex flex-wrap gap-2">
            {cuisineOptions.map((cuisine) => (
              <Badge
                key={cuisine}
                variant={cuisinePreferences.includes(cuisine) ? "default" : "outline"}
                className={`cursor-pointer text-sm py-2 px-3 ${
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
        <div className="p-6 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm">
          <label className="flex items-start gap-4 cursor-pointer">
            <Checkbox
              checked={useMyRecipes}
              onCheckedChange={(checked) => setUseMyRecipes(checked as boolean)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-semibold text-base flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Utiliser mes recettes personnelles
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Le planificateur privilégiera vos recettes sauvegardées pour créer votre menu
              </p>
            </div>
          </label>
        </div>

        {/* Bouton de génération */}
        <div className="sticky bottom-4 p-6 rounded-xl bg-white dark:bg-stone-800 border-2 border-emerald-200 dark:border-emerald-800 shadow-lg">
          <Button
            onClick={handleGenerate}
            disabled={isLoading || mealTypes.length === 0}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                Génération de votre menu...
              </>
            ) : (
              <>
                <Sparkles className="h-6 w-6 mr-2" />
                Générer mon menu de la semaine
              </>
            )}
          </Button>
          {mealTypes.length === 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">
              Veuillez sélectionner au moins un type de repas
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
