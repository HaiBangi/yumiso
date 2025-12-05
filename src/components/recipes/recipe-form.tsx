"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Trash2, ChefHat, Clock, Image, ListOrdered, 
  UtensilsCrossed, UserX, ImageIcon, Video, Tag, 
  Sparkles, Users, Star, Timer, Flame, Save, X, RotateCcw
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { createRecipe, updateRecipe } from "@/actions/recipes";
import { TagInput } from "./tag-input";
import type { Recipe } from "@/types/recipe";

// Key for localStorage draft
const DRAFT_KEY = "gourmiso_recipe_draft";

interface DraftData {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  videoUrl: string;
  preparationTime: string;
  cookingTime: string;
  servings: string;
  rating: string;
  publishAnonymously: boolean;
  tags: string[];
  ingredients: { id: string; name: string; quantity: string; unit: string }[];
  steps: { id: string; text: string }[];
  savedAt: number;
}

const categories = [
  { value: "MAIN_DISH", label: "Plat principal", emoji: "🍽️" },
  { value: "STARTER", label: "Entrée", emoji: "🥗" },
  { value: "DESSERT", label: "Dessert", emoji: "🍰" },
  { value: "SIDE_DISH", label: "Accompagnement", emoji: "🥔" },
  { value: "SOUP", label: "Soupe", emoji: "🍲" },
  { value: "SALAD", label: "Salade", emoji: "🥬" },
  { value: "BEVERAGE", label: "Boisson", emoji: "🍹" },
  { value: "SNACK", label: "En-cas", emoji: "🍿" },
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

function getInitialSteps(recipe?: Recipe): StepInput[] {
  if (!recipe?.steps?.length) {
    return [{ id: "step-0", text: "" }];
  }
  return recipe.steps.map((step, index) => ({
    id: `step-${index}`,
    text: step.text,
  }));
}

// Section Card Component
function SectionCard({ 
  children, 
  icon: Icon, 
  title, 
  color,
  action 
}: { 
  children: React.ReactNode;
  icon: React.ElementType;
  title: string;
  color: "amber" | "blue" | "purple" | "emerald" | "rose";
  action?: React.ReactNode;
}) {
  const colorClasses = {
    amber: "border-l-amber-400 bg-amber-50/30",
    blue: "border-l-blue-400 bg-blue-50/30",
    purple: "border-l-purple-400 bg-purple-50/30",
    emerald: "border-l-emerald-400 bg-emerald-50/30",
    rose: "border-l-rose-400 bg-rose-50/30",
  };

  const iconColors = {
    amber: "text-amber-600 bg-amber-100",
    blue: "text-blue-600 bg-blue-100",
    purple: "text-purple-600 bg-purple-100",
    emerald: "text-emerald-600 bg-emerald-100",
    rose: "text-rose-600 bg-rose-100",
  };

  return (
    <div className={`rounded-lg border-l-4 ${colorClasses[color]} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-md ${iconColors[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-stone-800 text-sm">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function RecipeForm({ recipe, trigger }: RecipeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

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
  const [tags, setTags] = useState<string[]>(recipe?.tags || []);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [steps, setSteps] = useState<StepInput[]>([]);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    // Only save drafts for new recipes, not edits
    if (recipe) return;
    
    const draft: DraftData = {
      name,
      description,
      category,
      imageUrl,
      videoUrl,
      preparationTime,
      cookingTime,
      servings,
      rating,
      publishAnonymously,
      tags,
      ingredients,
      steps,
      savedAt: Date.now(),
    };
    
    // Only save if there's meaningful content
    const hasContent = name.trim() || 
      description.trim() || 
      ingredients.some(i => i.name.trim()) || 
      steps.some(s => s.text.trim());
    
    if (hasContent) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.warn("Could not save draft to localStorage");
      }
    }
  }, [name, description, category, imageUrl, videoUrl, preparationTime, cookingTime, servings, rating, publishAnonymously, tags, ingredients, steps, recipe]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    if (recipe) return null;
    
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        // Only restore if draft is less than 24 hours old
        if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
          return draft;
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch (e) {
      console.warn("Could not load draft from localStorage");
    }
    return null;
  }, [recipe]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.warn("Could not clear draft from localStorage");
    }
  }, []);

  // Auto-save draft when form changes (debounced)
  useEffect(() => {
    if (!mounted || !open || recipe) return;
    
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 1000); // Save after 1 second of inactivity
    
    return () => clearTimeout(timeoutId);
  }, [mounted, open, saveDraft, recipe]);

  // Save draft when dialog closes (for new recipes only)
  const prevOpenRef = useRef(open);
  useEffect(() => {
    // When dialog closes (open goes from true to false)
    if (prevOpenRef.current && !open && !recipe && mounted) {
      // Save draft one last time with current values
      const draft: DraftData = {
        name,
        description,
        category,
        imageUrl,
        videoUrl,
        preparationTime,
        cookingTime,
        servings,
        rating,
        publishAnonymously,
        tags,
        ingredients,
        steps,
        savedAt: Date.now(),
      };
      
      const hasContent = name.trim() || 
        description.trim() || 
        ingredients.some(i => i.name.trim()) || 
        steps.some(s => s.text.trim());
      
      if (hasContent) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (e) {
          console.warn("Could not save draft to localStorage");
        }
      }
    }
    prevOpenRef.current = open;
  }, [open, recipe, mounted, name, description, category, imageUrl, videoUrl, preparationTime, cookingTime, servings, rating, publishAnonymously, tags, ingredients, steps]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) return;
    
    if (recipe) {
      // For editing: load from recipe
      setIngredients(getInitialIngredients(recipe));
      setSteps(getInitialSteps(recipe));
      setTags(recipe?.tags || []);
      setMounted(true);
    } else {
      // For new recipe: try to restore draft first
      const draft = loadDraft();
      if (draft && (draft.name || draft.ingredients.some(i => i.name) || draft.steps.some(s => s.text))) {
        setName(draft.name);
        setDescription(draft.description);
        setCategory(draft.category as typeof category);
        setImageUrl(draft.imageUrl);
        setVideoUrl(draft.videoUrl);
        setPreparationTime(draft.preparationTime);
        setCookingTime(draft.cookingTime);
        setServings(draft.servings);
        setRating(draft.rating);
        setPublishAnonymously(draft.publishAnonymously);
        setTags(draft.tags);
        setIngredients(draft.ingredients.length > 0 ? draft.ingredients : [{ id: "ing-0", name: "", quantity: "", unit: "" }]);
        setSteps(draft.steps.length > 0 ? draft.steps : [{ id: "step-0", text: "" }]);
        setDraftRestored(true);
        setMounted(true);
      } else {
        // No draft: initialize empty
        setIngredients([{ id: "ing-0", name: "", quantity: "", unit: "" }]);
        setSteps([{ id: "step-0", text: "" }]);
        setMounted(true);
      }
    }
  }, [open, recipe, loadDraft]);

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
      tags: tags.map((t) => t.toLowerCase().trim()).filter(Boolean),
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
        clearDraft(); // Clear draft on successful save
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
      setTags([]);
      setPublishAnonymously(false);
      clearDraft(); // Clear draft when resetting
    }
    setError(null);
    setDraftRestored(false);
  };

  const handleDialogClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && recipe) {
      // For edits, reset form when closing
      resetForm();
    }
    // For new recipes, draft is saved by useEffect when open changes
  };

  const selectedCategory = categories.find(c => c.value === category);

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl lg:max-w-5xl xl:max-w-6xl max-h-[92vh] p-0 overflow-hidden gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">
          {recipe ? "Modifier la recette" : "Nouvelle recette"}
        </DialogTitle>
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-semibold text-white">
                  {recipe ? "Modifier la recette" : "Nouvelle recette"}
                </h2>
                <p className="text-white/80 text-xs mt-0.5">
                  {recipe ? "Mettez à jour votre création culinaire" : "Partagez votre création culinaire"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(92vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <div className="p-1 bg-red-100 rounded-full">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-red-800 font-medium text-sm">Erreur</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Draft restored message */}
            {draftRestored && !recipe && (
              <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-100 rounded-full">
                    <RotateCcw className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-blue-800 font-medium text-sm">Brouillon restauré</p>
                    <p className="text-blue-600 text-xs">Votre travail précédent a été récupéré automatiquement</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setDraftRestored(false);
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 text-xs cursor-pointer"
                >
                  Recommencer
                </Button>
              </div>
            )}

            {/* Main Grid Layout */}
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Left Column */}
              <div className="space-y-5">
                {/* Basic Info Section */}
                <SectionCard icon={Sparkles} title="Informations essentielles" color="amber">
                  <div className="space-y-4">
                    {/* Name + Category + Anonymous in flex */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 min-w-0">
                        <Label htmlFor="name" className="text-stone-700 text-xs font-medium mb-1.5 block">
                          Nom de la recette <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Blanquette de veau..."
                          required
                          className="h-10 bg-white border-stone-200 focus:border-amber-400 focus:ring-amber-400/20 placeholder:text-stone-300 placeholder:italic"
                        />
                      </div>
                      <div className="flex gap-2 sm:flex-shrink-0">
                        <div>
                          <Label className="text-stone-700 text-xs font-medium mb-1.5 block">
                            Catégorie
                          </Label>
                          <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
                            <SelectTrigger className="cursor-pointer h-10 w-40 bg-white border-stone-200">
                              <SelectValue>
                                {selectedCategory && (
                                  <span className="flex items-center gap-2">
                                    <span>{selectedCategory.emoji}</span>
                                    <span>{selectedCategory.label}</span>
                                  </span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value} className="cursor-pointer">
                                  <span className="flex items-center gap-2">
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-stone-700 text-xs font-medium mb-1.5 block">
                            Auteur
                          </Label>
                          <div 
                            className="flex items-center gap-2 h-10 px-3 border border-stone-200 rounded-md bg-white cursor-pointer hover:bg-stone-50 transition-colors" 
                            onClick={() => setPublishAnonymously(!publishAnonymously)}
                          >
                            <Checkbox
                              id="publishAnonymously"
                              checked={publishAnonymously}
                              onCheckedChange={(checked) => setPublishAnonymously(checked === true)}
                              className="h-4 w-4"
                            />
                            <label htmlFor="publishAnonymously" className="text-sm text-stone-600 cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                              <UserX className="h-3.5 w-3.5" />
                              Anonyme
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <Label htmlFor="description" className="text-stone-700 text-xs font-medium mb-1.5 block">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Une courte description de votre recette..."
                        rows={2}
                        className="bg-white border-stone-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none placeholder:text-stone-300 placeholder:italic"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <Label className="text-stone-700 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-amber-500" />
                        Tags / Mots-clés
                      </Label>
                      <TagInput
                        value={tags}
                        onChange={setTags}
                        placeholder="Ex: asiatique, riz, végétarien..."
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Time & Servings Section */}
                <SectionCard icon={Clock} title="Temps & Portions" color="blue">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-stone-700 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5 text-blue-500" />
                        Préparation
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          value={preparationTime}
                          onChange={(e) => setPreparationTime(e.target.value)}
                          placeholder="—"
                          className="h-10 bg-white border-stone-200 pr-10 placeholder:text-stone-300 placeholder:italic"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">min</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-stone-700 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        Cuisson
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          value={cookingTime}
                          onChange={(e) => setCookingTime(e.target.value)}
                          placeholder="—"
                          className="h-10 bg-white border-stone-200 pr-10 placeholder:text-stone-300 placeholder:italic"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">min</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-stone-700 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-500" />
                        Portions
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={servings}
                        onChange={(e) => setServings(e.target.value)}
                        placeholder="—"
                        className="h-10 bg-white border-stone-200 placeholder:text-stone-300 placeholder:italic"
                      />
                    </div>
                    <div>
                      <Label className="text-stone-700 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-yellow-500" />
                        Note
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={rating}
                          onChange={(e) => setRating(e.target.value)}
                          placeholder="—"
                          className="h-10 bg-white border-stone-200 pr-10 placeholder:text-stone-300 placeholder:italic"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">/10</span>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Media Section */}
                <SectionCard icon={Image} title="Médias" color="purple">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-stone-700 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-purple-500" />
                        URL de l&apos;image
                      </Label>
                      <Input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-10 bg-white border-stone-200 placeholder:text-stone-300 placeholder:italic"
                      />
                    </div>
                    <div>
                      <Label className="text-stone-700 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Video className="h-3.5 w-3.5 text-red-500" />
                        URL de la vidéo
                      </Label>
                      <Input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-10 bg-white border-stone-200 placeholder:text-stone-300 placeholder:italic"
                      />
                    </div>
                  </div>
                  {/* Image Preview */}
                  {imageUrl && (
                    <div className="mt-3 relative rounded-lg overflow-hidden bg-stone-100 h-32">
                      <img 
                        src={imageUrl} 
                        alt="Aperçu" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                {/* Ingredients Section */}
                <SectionCard 
                  icon={UtensilsCrossed} 
                  title={`Ingrédients ${ingredients.filter(i => i.name.trim()).length > 0 ? `(${ingredients.filter(i => i.name.trim()).length})` : ''}`}
                  color="emerald"
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addIngredient}
                      className="h-7 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-100 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Ajouter
                    </Button>
                  }
                >
                  <div className="space-y-2">
                    {/* Header row - aligned with the inputs below */}
                    <div className="hidden sm:grid grid-cols-[60px_80px_1fr_32px] gap-2 text-xs text-stone-500 font-medium ml-2 mr-2">
                      <span className="text-center">Quantité</span>
                      <span className="text-center">Unité</span>
                      <span className="pl-1">Ingrédient</span>
                      <span></span>
                    </div>
                    {mounted && ingredients.map((ing, index) => (
                      <div 
                        key={ing.id} 
                        className="grid grid-cols-[60px_80px_1fr_32px] gap-2 items-center px-2 py-2 rounded-lg bg-white border border-stone-100 hover:border-emerald-200 transition-colors"
                      >
                        <Input
                          value={ing.quantity}
                          onChange={(e) => updateIngredient(ing.id, "quantity", e.target.value)}
                          placeholder="—"
                          className="h-8 text-sm text-center bg-stone-50 border-stone-200 placeholder:text-stone-300 placeholder:italic"
                        />
                        <Input
                          value={ing.unit}
                          onChange={(e) => updateIngredient(ing.id, "unit", e.target.value)}
                          placeholder="—"
                          className="h-8 text-sm text-center bg-stone-50 border-stone-200 placeholder:text-stone-300 placeholder:italic"
                        />
                        <Input
                          value={ing.name}
                          onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                          placeholder={`Nom de l'ingrédient...`}
                          className="h-8 text-sm border-stone-200 placeholder:text-stone-300 placeholder:italic"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIngredient(ing.id)}
                          disabled={ingredients.length === 1}
                          className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {ingredients.length === 1 && !ingredients[0].name && (
                      <p className="text-xs text-stone-400 italic text-center py-2">
                        Ajoutez les ingrédients de votre recette
                      </p>
                    )}
                  </div>
                </SectionCard>

                {/* Steps Section */}
                <SectionCard 
                  icon={ListOrdered} 
                  title={`Étapes de préparation ${steps.filter(s => s.text.trim()).length > 0 ? `(${steps.filter(s => s.text.trim()).length})` : ''}`}
                  color="rose"
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addStep}
                      className="h-7 text-xs border-rose-300 text-rose-600 hover:bg-rose-100 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Ajouter
                    </Button>
                  }
                >
                  <div className="space-y-3">
                    {mounted && steps.map((step, index) => (
                      <div 
                        key={step.id} 
                        className="flex gap-3 p-3 rounded-lg bg-white border border-stone-100 hover:border-rose-200 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-xs font-bold shadow-sm">
                            {index + 1}
                          </span>
                        </div>
                        <Textarea
                          value={step.text}
                          onChange={(e) => updateStep(step.id, e.target.value)}
                          placeholder={`Décrivez l'étape ${index + 1}...`}
                          rows={2}
                          className="flex-1 text-sm border-stone-200 resize-none bg-stone-50 focus:bg-white placeholder:text-stone-300 placeholder:italic"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(step.id)}
                          disabled={steps.length === 1}
                          className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 cursor-pointer disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {steps.length === 1 && !steps[0].text && (
                      <p className="text-xs text-stone-400 italic text-center py-2">
                        Décrivez les étapes de préparation
                      </p>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>
          </form>
        </ScrollArea>

        {/* Sticky Footer */}
        <div className="border-t border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              <span className="text-red-500">*</span> Champs obligatoires
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="px-5 cursor-pointer"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className="px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {recipe ? "Enregistrer" : "Créer la recette"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
