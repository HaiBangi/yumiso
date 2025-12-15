"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ErrorAlert } from "@/components/ui/error-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GenerateMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  onSuccess: () => void;
}

const MEAL_TYPES = [
  { id: "breakfast", label: "Petit-déjeuner", time: "08:00" },
  { id: "lunch", label: "Déjeuner", time: "12:00" },
  { id: "snack", label: "Collation", time: "16:00" },
  { id: "dinner", label: "Dîner", time: "19:00" },
];

const CUISINE_TYPES = [
  "Française", "Italienne", "Asiatique", "Mexicaine", 
  "Méditerranéenne", "Indienne", "Japonaise", "Végétarienne"
];

export function GenerateMenuDialog({ open, onOpenChange, planId, onSuccess }: GenerateMenuDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(["lunch", "dinner"]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [preferences, setPreferences] = useState("");
  const [recipeMode, setRecipeMode] = useState<"new" | "existing" | "mix">("mix");
  
  // États pour la recherche de recettes
  const [recipeSearch, setRecipeSearch] = useState("");
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<any[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Charger toutes les recettes au montage
  useEffect(() => {
    if (open) {
      fetchAllRecipes();
    }
  }, [open]);

  // Fermer les suggestions si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAllRecipes = async () => {
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) {
        const data = await res.json();
        setAllRecipes(data);
      }
    } catch (error) {
      console.error("Erreur chargement recettes:", error);
    }
  };

  // Fonction de normalisation pour ignorer accents et casse
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae");
  };

  // Filtrer les recettes en fonction de la recherche
  useEffect(() => {
    if (!recipeSearch.trim()) {
      setFilteredRecipes([]);
      return;
    }

    const searchTerms = normalizeString(recipeSearch).split(" ").filter(Boolean);
    
    const filtered = allRecipes
      .filter((recipe) => {
        // Exclure les recettes déjà sélectionnées
        if (selectedRecipes.some(r => r.id === recipe.id)) return false;

        const recipeName = normalizeString(recipe.name);
        const recipeCategory = recipe.category ? normalizeString(recipe.category) : "";
        const recipeAuthor = recipe.author ? normalizeString(recipe.author.name || "") : "";

        // Recherche intelligente : tous les termes doivent être trouvés
        return searchTerms.every((term) =>
          recipeName.includes(term) ||
          recipeCategory.includes(term) ||
          recipeAuthor.includes(term)
        );
      })
      .slice(0, 10); // Top 10 résultats

    setFilteredRecipes(filtered);
  }, [recipeSearch, allRecipes, selectedRecipes]);

  const addRecipe = (recipe: any) => {
    setSelectedRecipes([...selectedRecipes, recipe]);
    setRecipeSearch("");
    setFilteredRecipes([]);
    setShowSuggestions(false);
  };

  const removeRecipe = (recipeId: number) => {
    setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipeId));
  };

  const toggleMealType = (mealId: string) => {
    setSelectedMealTypes(prev =>
      prev.includes(mealId)
        ? prev.filter(id => id !== mealId)
        : [...prev, mealId]
    );
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const handleGenerate = async () => {
    if (selectedMealTypes.length === 0) {
      alert("Veuillez sélectionner au moins un type de repas");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/meal-planner/generate-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          numberOfPeople,
          mealTypes: selectedMealTypes,
          cuisinePreferences: selectedCuisines,
          preferences,
          recipeMode, // "new", "existing", ou "mix"
          includeRecipes: selectedRecipes.map(r => r.id), // IDs des recettes à inclure
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('❌ Erreur API:', errorData);
        throw new Error(
          `Erreur ${res.status}: ${errorData.message || errorData.error}\n\n` +
          `Détails: ${errorData.details || 'Aucun détail disponible'}\n\n` +
          `Timestamp: ${errorData.timestamp || new Date().toISOString()}`
        );
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Erreur complète:', error);
      setError(
        `Erreur lors de la génération du menu:\n\n${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-emerald-600" />
            Générer un Menu Automatiquement
          </DialogTitle>
          <DialogDescription>
            Laissez l&apos;IA créer un menu complet pour votre semaine
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nombre de personnes */}
          <div className="space-y-2">
            <Label htmlFor="people">Nombre de personnes</Label>
            <Input
              id="people"
              type="number"
              min={1}
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Types de repas */}
          <div className="space-y-3">
            <Label>Types de repas à générer</Label>
            <div className="grid grid-cols-2 gap-3">
              {MEAL_TYPES.map((meal) => (
                <div key={meal.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={meal.id}
                    checked={selectedMealTypes.includes(meal.id)}
                    onCheckedChange={() => toggleMealType(meal.id)}
                  />
                  <label
                    htmlFor={meal.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {meal.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Types de cuisine */}
          <div className="space-y-3">
            <Label>Types de cuisine préférés (optionnel)</Label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_TYPES.map((cuisine) => (
                <Badge
                  key={cuisine}
                  variant={selectedCuisines.includes(cuisine) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCuisine(cuisine)}
                >
                  {cuisine}
                </Badge>
              ))}
            </div>
          </div>

          {/* Sélection de recettes à inclure */}
          <div className="space-y-3">
            <Label>Inclure des recettes spécifiques (optionnel)</Label>
            <p className="text-xs text-stone-500 mb-2">
              Recherchez et sélectionnez les recettes que vous voulez absolument dans le menu
            </p>
            
            {/* Barre de recherche avec autocomplétion */}
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Rechercher une recette (ex: pâtes, boeuf, salade...)"
                  value={recipeSearch}
                  onChange={(e) => {
                    setRecipeSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9"
                />
              </div>

              {/* Liste de suggestions */}
              {showSuggestions && filteredRecipes.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => addRecipe(recipe)}
                      className="w-full px-4 py-3 text-left hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-700 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-stone-900 dark:text-stone-100 truncate">
                          {recipe.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {recipe.category && (
                            <span className="text-xs text-stone-500 dark:text-stone-400">
                              {recipe.category}
                            </span>
                          )}
                          {recipe.author?.name && (
                            <span className="text-xs text-stone-400 dark:text-stone-500">
                              {recipe.author.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        {recipe.prepTime && <span>⏱ {recipe.prepTime} min</span>}
                        {recipe.caloriesPerServing && <span>🔥 {recipe.caloriesPerServing} kcal</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recettes sélectionnées */}
            {selectedRecipes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedRecipes.map((recipe) => (
                  <Badge
                    key={recipe.id}
                    variant="secondary"
                    className="gap-1 pr-1 pl-3 py-1"
                  >
                    <span className="text-sm">{recipe.name}</span>
                    <button
                      onClick={() => removeRecipe(recipe.id)}
                      className="ml-1 hover:bg-stone-300 dark:hover:bg-stone-600 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Autres informations */}
          <div className="space-y-2">
            <Label htmlFor="preferences">Autres informations (optionnel)</Label>
            <Textarea
              id="preferences"
              placeholder="Ex: Jeudi je veux une omelette, vendredi je veux bo bun, je ne veux aucun plat de pâtes, pas de poisson..."
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-stone-500">
              Indiquez vos souhaits spécifiques, plats à éviter, jours particuliers, etc.
            </p>
          </div>

          {/* Mode de génération des recettes */}
          <div className="space-y-2">
            <Label htmlFor="recipeMode">Mode de génération</Label>
            <Select value={recipeMode} onValueChange={(value: "new" | "existing" | "mix") => setRecipeMode(value)}>
              <SelectTrigger id="recipeMode">
                <SelectValue placeholder="Choisir le mode de génération" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Créer de nouvelles recettes</span>
                    <span className="text-xs text-stone-500">L&apos;IA génère uniquement de nouvelles recettes</span>
                  </div>
                </SelectItem>
                <SelectItem value="existing">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Utiliser mes recettes existantes</span>
                    <span className="text-xs text-stone-500">Utilise uniquement vos recettes déjà créées</span>
                  </div>
                </SelectItem>
                <SelectItem value="mix">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Mix des deux</span>
                    <span className="text-xs text-stone-500">Combine vos recettes et de nouvelles suggestions</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer le Menu
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}