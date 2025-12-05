"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, GripVertical, ChefHat, Clock, Image, ListOrdered, UtensilsCrossed, UserX, ImageIcon, Video } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { createRecipe, updateRecipe } from "@/actions/recipes";
import type { Recipe } from "@/types/recipe";

const categories = [
  { value: "MAIN_DISH", label: "Plat principal" },
  { value: "STARTER", label: "Entrée" },
  { value: "DESSERT", label: "Dessert" },
  { value: "SIDE_DISH", label: "Accompagnement" },
  { value: "SOUP", label: "Soupe" },
  { value: "SALAD", label: "Salade" },
  { value: "BEVERAGE", label: "Boisson" },
  { value: "SNACK", label: "En-cas" },
];

interface IngredientInput {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

interface StepInput {
  id: string;
  text: string;
}

interface RecipeFormProps {
  recipe?: Recipe;
  trigger: React.ReactNode;
}

// Helper to create initial ingredients from recipe
function getInitialIngredients(recipe?: Recipe): IngredientInput[] {
  if (!recipe?.ingredients?.length) {
    return [{ id: "ing-0", name: "", quantity: "", unit: "" }];
  }
  return recipe.ingredients.map((ing, index) => ({
    id: `ing-${index}`,
    name: ing.name,
    quantity: ing.quantity?.toString() || "",
    unit: ing.unit || "",
  }));
}

// Helper to create initial steps from recipe
function getInitialSteps(recipe?: Recipe): StepInput[] {
  if (!recipe?.steps?.length) {
    return [{ id: "step-0", text: "" }];
  }
  return recipe.steps.map((step, index) => ({
    id: `step-${index}`,
    text: step.text,
  }));
}

export function RecipeForm({ recipe, trigger }: RecipeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Form state - simple initial values
  const [name, setName] = useState(recipe?.name || "");
  const [description, setDescription] = useState(recipe?.description || "");
  const [category, setCategory] = useState(recipe?.category || "MAIN_DISH");
  const [author, setAuthor] = useState(recipe?.author || "");
  const [imageUrl, setImageUrl] = useState(recipe?.imageUrl || "");
  const [videoUrl, setVideoUrl] = useState(recipe?.videoUrl || "");
  const [preparationTime, setPreparationTime] = useState(
    recipe?.preparationTime?.toString() || ""
  );
  const [cookingTime, setCookingTime] = useState(
    recipe?.cookingTime?.toString() || ""
  );
  const [servings, setServings] = useState(recipe?.servings?.toString() || "");
  const [rating, setRating] = useState(recipe?.rating?.toString() || "");
  const [publishAnonymously, setPublishAnonymously] = useState(false);

  // Initialize with empty arrays, populate on mount
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [steps, setSteps] = useState<StepInput[]>([]);

  // Initialize ingredients and steps on client side only
  useEffect(() => {
    setIngredients(getInitialIngredients(recipe));
    setSteps(getInitialSteps(recipe));
    setMounted(true);
  }, [recipe]);

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: `ing-${Date.now()}`, name: "", quantity: "", unit: "" },
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((ing) => ing.id !== id));
    }
  };

  const updateIngredient = (
    id: string,
    field: keyof IngredientInput,
    value: string
  ) => {
    setIngredients(
      ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const addStep = () => {
    setSteps([...steps, { id: `step-${Date.now()}`, text: "" }]);
  };

  const removeStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter((step) => step.id !== id));
    }
  };

  const updateStep = (id: string, text: string) => {
    setSteps(steps.map((step) => (step.id === id ? { ...step, text } : step)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = {
      name,
      description: description || null,
      category: category as Recipe["category"],
      author: publishAnonymously ? "Anonyme" : "",
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      preparationTime: parseInt(preparationTime) || 0,
      cookingTime: parseInt(cookingTime) || 0,
      servings: parseInt(servings) || 1,
      rating: parseInt(rating) || 0,
      ingredients: ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name,
          quantity: ing.quantity ? parseFloat(ing.quantity) : null,
          unit: ing.unit || null,
        })),
      steps: steps
        .filter((step) => step.text.trim())
        .map((step, index) => ({
          order: index + 1,
          text: step.text,
        })),
    };

    try {
      let result;
      if (recipe) {
        result = await updateRecipe(recipe.id, formData);
      } else {
        result = await createRecipe(formData);
      }

      if (result.success) {
        setOpen(false);
        router.push("/recipes");
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!recipe) {
      setName("");
      setDescription("");
      setCategory("MAIN_DISH");
      setAuthor("");
      setImageUrl("");
      setVideoUrl("");
      setPreparationTime("");
      setCookingTime("");
      setServings("");
      setRating("");
      setIngredients([{ id: "ing-0", name: "", quantity: "", unit: "" }]);
      setSteps([{ id: "step-0", text: "" }]);
    }
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-stone-50">
          <DialogTitle className="font-serif text-2xl text-stone-800 flex items-center gap-3">
            <ChefHat className="h-6 w-6 text-amber-500" />
            {recipe ? "Modifier la recette" : "Nouvelle recette"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Section: Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-700 border-b border-amber-200 pb-2">
                <ChefHat className="h-4 w-4 text-amber-500" />
                <h3 className="font-medium">Informations générales</h3>
              </div>
              
              <div className="grid gap-5 sm:grid-cols-6">
                {/* Nom de la recette */}
                <div className="sm:col-span-3 space-y-2">
                  <Label htmlFor="name" className="text-stone-600">
                    Nom de la recette <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Blanquette de veau"
                    required
                  />
                </div>

                {/* Publier anonymement */}
                <div className="sm:col-span-1 space-y-2">
                  <Label className="text-stone-600 text-sm">Publication</Label>
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-stone-50">
                    <Checkbox
                      id="publishAnonymously"
                      checked={publishAnonymously}
                      onCheckedChange={(checked) => setPublishAnonymously(checked === true)}
                    />
                    <label
                      htmlFor="publishAnonymously"
                      className="text-sm text-stone-600 cursor-pointer flex items-center gap-1"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Anonyme
                    </label>
                  </div>
                </div>

                {/* Catégorie */}
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="category" className="text-stone-600">
                    Catégorie
                  </Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="cursor-pointer">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="sm:col-span-6 space-y-2">
                  <Label htmlFor="description" className="text-stone-600">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Une courte description de la recette..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Section: Times & Servings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-700 border-b border-blue-200 pb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <h3 className="font-medium">Temps & Portions</h3>
              </div>
              
              <div className="grid gap-5 grid-cols-2 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="preparationTime" className="text-stone-600 text-sm">
                    Préparation (min)
                  </Label>
                  <Input
                    id="preparationTime"
                    type="number"
                    min="0"
                    value={preparationTime}
                    onChange={(e) => setPreparationTime(e.target.value)}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cookingTime" className="text-stone-600 text-sm">
                    Cuisson (min)
                  </Label>
                  <Input
                    id="cookingTime"
                    type="number"
                    min="0"
                    value={cookingTime}
                    onChange={(e) => setCookingTime(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings" className="text-stone-600 text-sm">
                    Portions
                  </Label>
                  <Input
                    id="servings"
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating" className="text-stone-600 text-sm">
                    Note (/10)
                  </Label>
                  <Input
                    id="rating"
                    type="number"
                    min="0"
                    max="10"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="8"
                  />
                </div>
              </div>
            </div>

            {/* Section: Media URLs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-700 border-b border-purple-200 pb-2">
                <Image className="h-4 w-4 text-purple-500" />
                <h3 className="font-medium">Médias</h3>
              </div>
              
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-stone-600 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4" />
                    URL de l&apos;image
                  </Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="videoUrl" className="text-stone-600 flex items-center gap-1.5">
                    <Video className="h-4 w-4" />
                    URL de la vidéo
                  </Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Section: Ingredients */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
                  <h3 className="font-medium">Ingrédients</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addIngredient}
                  className="border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>
              
              <div className="space-y-2">
                {mounted && ingredients.map((ing, index) => (
                  <div key={ing.id} className="flex gap-2 items-center">
                    <GripVertical className="h-4 w-4 text-stone-300 flex-shrink-0" />
                    <Input
                      value={ing.quantity}
                      onChange={(e) =>
                        updateIngredient(ing.id, "quantity", e.target.value)
                      }
                      placeholder="Qté"
                      className="w-20"
                    />
                    <Input
                      value={ing.unit}
                      onChange={(e) =>
                        updateIngredient(ing.id, "unit", e.target.value)
                      }
                      placeholder="Unité"
                      className="w-28"
                    />
                    <Input
                      value={ing.name}
                      onChange={(e) =>
                        updateIngredient(ing.id, "name", e.target.value)
                      }
                      placeholder={`Ingrédient ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(ing.id)}
                      disabled={ingredients.length === 1}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <div className="flex items-center gap-2 text-rose-700">
                  <ListOrdered className="h-4 w-4 text-rose-500" />
                  <h3 className="font-medium">Étapes</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  className="border-rose-300 text-rose-600 hover:bg-rose-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>
              
              <div className="space-y-3">
                {mounted && steps.map((step, index) => (
                  <div key={step.id} className="flex gap-3 items-start">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-rose-500 text-white text-sm font-medium">
                      {index + 1}
                    </span>
                    <Textarea
                      value={step.text}
                      onChange={(e) => updateStep(step.id, e.target.value)}
                      placeholder={`Décrivez l'étape ${index + 1}...`}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(step.id)}
                      disabled={steps.length === 1}
                      className="text-stone-400 hover:text-red-500 mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-stone-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="px-6"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="px-6 bg-amber-500 hover:bg-amber-600"
              >
                {loading
                  ? "Enregistrement..."
                  : recipe
                  ? "Enregistrer"
                  : "Créer la recette"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
