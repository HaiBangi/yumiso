"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Sparkles, Users, Star, Timer, Flame, Save, X, RotateCcw, GripVertical, Coins, FolderPlus, List
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { createRecipe, updateRecipe } from "@/actions/recipes";
import { TagInput } from "./tag-input";
import { IngredientGroupsEditor } from "./ingredient-groups-editor";
import { QuickYouTubeImport } from "./quick-youtube-import";
import { getUserPseudo } from "@/actions/users";
import {
  convertGroupToApiFormat,
  convertIngredientsToGroups,
  convertDbGroupsToFormGroups,
  flattenGroupsToIngredients,
  wrapIngredientsInDefaultGroup,
  type IngredientGroupInput
} from "@/lib/ingredient-helpers";
import type { Recipe } from "@/types/recipe";

// Key for localStorage draft
const DRAFT_KEY = "yumiso_recipe_draft";

// Parse quantity+unit field (e.g., "150g" => {quantity: "150", unit: "g"})
function parseQuantityUnit(input: string): { quantity: string; unit: string } {
  if (!input.trim()) {
    return { quantity: "", unit: "" };
  }

  // Match patterns like "150g", "1 c.à.s", "2.5 kg", etc.
  const match = input.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);

  if (match) {
    return {
      quantity: match[1].replace(",", "."), // Replace comma with dot for decimals
      unit: match[2].trim(),
    };
  }

  // If no number at the start, treat entire input as unit
  return { quantity: "", unit: input.trim() };
}

// Combine quantity and unit into a single string
function combineQuantityUnit(quantity: string, unit: string): string {
  if (!quantity && !unit) return "";
  if (!quantity) return unit;
  if (!unit) return quantity;
  return `${quantity} ${unit}`;
}

interface DraftData {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  videoUrl: string;
  preparationTime: string;
  cookingTime: string;
  servings: string;
  costEstimate: string;
  publishAnonymously?: boolean; // Optional for backward compatibility
  tags: string[];
  ingredients: { id: string; name: string; quantity?: string; unit?: string; quantityUnit: string }[];
  steps: { id: string; text: string }[];
  useGroups?: boolean; // Support for ingredient groups
  ingredientGroups?: IngredientGroupInput[]; // Ingredient groups data
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

const costOptions = [
  { value: "", label: "Non défini", emoji: "—" },
  { value: "CHEAP", label: "Économique", emoji: "€" },
  { value: "MEDIUM", label: "Moyen", emoji: "€€" },
  { value: "EXPENSIVE", label: "Cher", emoji: "€€€" },
];

interface IngredientInput {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  quantityUnit: string; // Combined field for UI
}

interface StepInput {
  id: string;
  text: string;
}

interface RecipeFormProps {
  recipe?: Recipe;
  trigger?: React.ReactNode; // Optional for YouTube to Recipe mode
  isYouTubeImport?: boolean; // Flag to indicate YouTube import with red theme
  onSuccess?: (recipeId: number) => void; // Callback when recipe is successfully saved
  onCancel?: () => void; // Callback when dialog is closed without saving
}

function getInitialIngredients(recipe?: Recipe): IngredientInput[] {
  if (!recipe?.ingredients?.length) {
    return [{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }];
  }
  return recipe.ingredients.map((ing, index) => ({
    id: `ing-${index}`,
    name: ing.name,
    quantity: ing.quantity?.toString() || "",
    unit: ing.unit || "",
    quantityUnit: combineQuantityUnit(ing.quantity?.toString() || "", ing.unit || ""),
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
    amber: "border-l-amber-400 bg-amber-50/30 dark:bg-amber-900/20",
    blue: "border-l-blue-400 bg-blue-50/30 dark:bg-blue-900/20",
    purple: "border-l-purple-400 bg-purple-50/30 dark:bg-purple-900/20",
    emerald: "border-l-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/20",
    rose: "border-l-rose-400 bg-rose-50/30 dark:bg-rose-900/20",
  };

  const iconColors = {
    amber: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50",
  };

  return (
    <div className={`rounded-lg border-l-4 ${colorClasses[color]} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-md ${iconColors[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function RecipeForm({ recipe, trigger, isYouTubeImport = false, onSuccess, onCancel }: RecipeFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [userPseudo, setUserPseudo] = useState<string>("Anonyme");

  // Check if this is a duplication (recipe with id=0) or an edit (recipe with id>0)
  const isDuplication = recipe && recipe.id === 0 && !isYouTubeImport; // Not a duplication if it's from YouTube
  const isEdit = recipe && recipe.id > 0;

  const [name, setName] = useState(recipe?.name || "");
  const [description, setDescription] = useState(recipe?.description || "");
  const [category, setCategory] = useState(recipe?.category || "MAIN_DISH");
  const [authorField, setAuthorField] = useState(recipe?.author || "");
  const [imageUrl, setImageUrl] = useState(recipe?.imageUrl || "");
  const [videoUrl, setVideoUrl] = useState(recipe?.videoUrl || "");
  const [preparationTime, setPreparationTime] = useState(
    recipe?.preparationTime?.toString() || ""
  );
  const [cookingTime, setCookingTime] = useState(
    recipe?.cookingTime?.toString() || ""
  );
  const [servings, setServings] = useState(recipe?.servings?.toString() || "");
  const [costEstimate, setCostEstimate] = useState(recipe?.costEstimate || "");
  const [tags, setTags] = useState<string[]>(recipe?.tags || []);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [steps, setSteps] = useState<StepInput[]>([]);

  // États pour le système de groupes d'ingrédients
  const [useGroups, setUseGroups] = useState(false);
  const [ingredientGroups, setIngredientGroups] = useState<IngredientGroupInput[]>([]);

  // Fonction pour remplir le formulaire avec une recette importée depuis YouTube
  const handleYouTubeRecipeImport = useCallback((importedRecipe: any) => {
    setName(importedRecipe.name || "");
    setDescription(importedRecipe.description || "");
    setCategory(importedRecipe.category || "MAIN_DISH");
    setImageUrl(importedRecipe.imageUrl || "");
    setVideoUrl(importedRecipe.videoUrl || "");
    setPreparationTime(importedRecipe.preparationTime?.toString() || "");
    setCookingTime(importedRecipe.cookingTime?.toString() || "");
    setServings(importedRecipe.servings?.toString() || "4");
    setCostEstimate(importedRecipe.costEstimate || "");
    setTags(importedRecipe.tags || []);

    if (importedRecipe.ingredientGroups && importedRecipe.ingredientGroups.length > 0) {
      setUseGroups(true);
      const formattedGroups = importedRecipe.ingredientGroups.map((group: any, groupIdx: number) => ({
        id: `group-${Date.now()}-${groupIdx}`,
        name: group.name,
        ingredients: group.ingredients.map((ing: any, ingIdx: number) => ({
          id: `ing-${Date.now()}-${groupIdx}-${ingIdx}`,
          name: ing.name,
          quantity: ing.quantity?.toString() || "",
          unit: ing.unit || "",
          quantityUnit: combineQuantityUnit(ing.quantity?.toString() || "", ing.unit || ""),
        })),
      }));
      setIngredientGroups(formattedGroups);
    } else if (importedRecipe.ingredients && importedRecipe.ingredients.length > 0) {
      setUseGroups(false);
      const formattedIngredients = importedRecipe.ingredients.map((ing: any, idx: number) => ({
        id: `ing-${Date.now()}-${idx}`,
        name: ing.name,
        quantity: ing.quantity?.toString() || "",
        unit: ing.unit || "",
        quantityUnit: combineQuantityUnit(ing.quantity?.toString() || "", ing.unit || ""),
      }));
      setIngredients(formattedIngredients);
    }

    if (importedRecipe.steps && importedRecipe.steps.length > 0) {
      const formattedSteps = importedRecipe.steps.map((step: any, idx: number) => ({
        id: `step-${Date.now()}-${idx}`,
        text: step.text || "",
      }));
      setSteps(formattedSteps);
    }
  }, []);

  // Fetch user pseudo when component mounts
  useEffect(() => {
    if (session?.user?.id) {
      getUserPseudo(session.user.id).then(setUserPseudo);
    }
  }, [session?.user?.id]);

  // Auto-open dialog if no trigger is provided (YouTube to Recipe mode)
  useEffect(() => {
    console.log('[RecipeForm] Auto-open check:', { trigger: !!trigger, recipe: !!recipe });
    if (!trigger && recipe) {
      console.log('[RecipeForm] Auto-opening dialog for YouTube to Recipe mode');
      setOpen(true);
    }
  }, [trigger, recipe]);

  // Save draft to localStorage - using refs to always get current values
  const saveDraftToStorage = () => {
    // Only save drafts for new recipes, not edits
    if (recipe) {
      console.log('[RecipeForm] Not saving draft - this is an edit');
      return;
    }

    // Read current state values at the time of calling
    const currentIngredients = ingredients;
    const currentSteps = steps;
    const currentUseGroups = useGroups;
    const currentIngredientGroups = ingredientGroups;

    const draft: DraftData = {
      name,
      description,
      category,
      imageUrl,
      videoUrl,
      preparationTime,
      cookingTime,
      servings,
      costEstimate,
      tags,
      ingredients: currentIngredients,
      steps: currentSteps,
      useGroups: currentUseGroups,
      ingredientGroups: currentIngredientGroups,
      savedAt: Date.now(),
    };

    console.log('[RecipeForm] saveDraft called with:', {
      ingredientsCount: currentIngredients.length,
      stepsCount: currentSteps.length,
      useGroups: currentUseGroups,
      groupsCount: currentIngredientGroups.length,
      ingredients: currentIngredients,
      steps: currentSteps,
    });

    // Only save if there's meaningful content
    const hasContent = name.trim() ||
      description.trim() ||
      (currentIngredients && currentIngredients.length > 0 && currentIngredients.some(i => i.name.trim())) ||
      (currentSteps && currentSteps.length > 0 && currentSteps.some(s => s.text.trim())) ||
      (currentIngredientGroups && currentIngredientGroups.length > 0 && currentIngredientGroups.some(g => g.ingredients.some(i => i.name.trim())));

    if (hasContent) {
      console.log('[RecipeForm] Saving draft to localStorage');
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        console.log('[RecipeForm] Draft saved successfully');
      } catch (e) {
        console.warn("Could not save draft to localStorage", e);
      }
    } else {
      console.log('[RecipeForm] No meaningful content to save');
    }
  };

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.warn("Could not clear draft from localStorage");
    }
  }, []);

  // Auto-save draft when form changes (debounced)
  // DISABLED: This was causing issues with stale state values
  // The draft is now only saved when the dialog closes
  // useEffect(() => {
  //   if (!mounted || !open || recipe || !shouldSaveDraft) return;
  //
  //   const timeoutId = setTimeout(() => {
  //     saveDraft();
  //   }, 1000); // Save after 1 second of inactivity
  //
  //   return () => clearTimeout(timeoutId);
  // }, [mounted, open, saveDraft, recipe, shouldSaveDraft]);

  // Note: Draft is now saved directly in handleDialogClose to capture current state values
  // The useEffect approach was causing stale state issues

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) return;

    console.log('[RecipeForm] Dialog opened, initializing form. Recipe:', !!recipe, 'Mounted:', mounted);

    if (recipe) {
      // For editing or duplication: load from recipe

      // Déterminer si on doit utiliser le mode groupes
      const hasGroups = !!(recipe.ingredientGroups && recipe.ingredientGroups.length > 0);
      setUseGroups(hasGroups);

      if (hasGroups) {
        // Charger les groupes depuis la recette
        setIngredientGroups(convertDbGroupsToFormGroups(recipe.ingredientGroups));
      } else {
        // Charger les ingrédients simples
        setIngredients(getInitialIngredients(recipe));
      }

      setSteps(getInitialSteps(recipe));
      setTags(recipe?.tags || []);

      // For duplication, reset the author to empty so it uses the current user's pseudo
      if (isDuplication) {
        setAuthorField("");
      }

      setMounted(true);
    } else {
      // For new recipe: try to restore draft first
      // Load draft directly here instead of using loadDraft callback
      let draft: DraftData | null = null;
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsedDraft: DraftData = JSON.parse(saved);
          // Only restore if draft is less than 24 hours old
          if (Date.now() - parsedDraft.savedAt < 24 * 60 * 60 * 1000) {
            draft = parsedDraft;
          } else {
            localStorage.removeItem(DRAFT_KEY);
          }
        }
      } catch (e) {
        console.warn("Could not load draft from localStorage");
      }

      console.log('[RecipeForm] Loading draft:', draft);
      
      if (draft && (
        draft.name || 
        (draft.ingredients && draft.ingredients.some(i => i.name)) || 
        (draft.steps && draft.steps.some(s => s.text)) || 
        (draft.ingredientGroups && draft.ingredientGroups.some(g => g.ingredients.some(i => i.name)))
      )) {
        console.log('[RecipeForm] Restoring draft with useGroups:', draft.useGroups);
        console.log('[RecipeForm] Draft ingredientGroups:', draft.ingredientGroups);
        console.log('[RecipeForm] Draft ingredients:', draft.ingredients);
        console.log('[RecipeForm] Draft steps:', draft.steps);
        
        setName(draft.name);
        setDescription(draft.description);
        setCategory(draft.category as typeof category);
        setImageUrl(draft.imageUrl);
        setVideoUrl(draft.videoUrl);
        setPreparationTime(draft.preparationTime);
        setCookingTime(draft.cookingTime);
        setServings(draft.servings);
        setCostEstimate(draft.costEstimate || "");
        setTags(draft.tags || []);
        
        // Restore useGroups and ingredient groups if available
        if (draft.useGroups && draft.ingredientGroups && draft.ingredientGroups.length > 0) {
          console.log('[RecipeForm] Restoring in GROUP mode');
          setUseGroups(true);
          setIngredientGroups(draft.ingredientGroups);
          // Initialize empty ingredients array when using groups
          setIngredients([{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }]);
        } else {
          console.log('[RecipeForm] Restoring in SIMPLE mode');
          setUseGroups(false);
          // Handle draft ingredients with backward compatibility
          const draftIngredients = (draft.ingredients && draft.ingredients.length > 0)
            ? draft.ingredients.map(ing => ({
                ...ing,
                quantityUnit: ing.quantityUnit || combineQuantityUnit(ing.quantity || "", ing.unit || "")
              }))
            : [{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }];
          console.log('[RecipeForm] Restored ingredients:', draftIngredients);
          setIngredients(draftIngredients);
          // Initialize empty groups array when using simple ingredients
          setIngredientGroups([]);
        }
        
        const restoredSteps = (draft.steps && draft.steps.length > 0) ? draft.steps : [{ id: "step-0", text: "" }];
        console.log('[RecipeForm] Restored steps:', restoredSteps);
        setSteps(restoredSteps);
        setDraftRestored(true);
        setMounted(true);
      } else {
        console.log('[RecipeForm] No draft to restore, initializing empty form');
        // No draft: initialize empty
        setIngredients([{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }]);
        setSteps([{ id: "step-0", text: "" }]);
        setUseGroups(false);
        setIngredientGroups([]);
        setMounted(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe, isDuplication]);

  // Auto-resize step textareas on mount and when steps change
  useEffect(() => {
    if (!mounted) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea[placeholder^="Décrivez l\'étape"]');
      textareas.forEach((textarea: Element) => {
        const ta = textarea as HTMLTextAreaElement;
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [mounted, steps]);

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: `ing-${Date.now()}`, name: "", quantity: "", unit: "", quantityUnit: "" },
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
      ingredients.map((ing) => {
        if (ing.id !== id) return ing;

        // If updating quantityUnit, parse it into quantity and unit
        if (field === "quantityUnit") {
          const parsed = parseQuantityUnit(value);
          return {
            ...ing,
            quantityUnit: value,
            quantity: parsed.quantity,
            unit: parsed.unit,
          };
        }

        return { ...ing, [field]: value };
      })
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

  // Drag and drop handlers for steps
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, stepId: string) => {
    setDraggedStepId(stepId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStepId: string) => {
    e.preventDefault();

    if (!draggedStepId || draggedStepId === targetStepId) {
      setDraggedStepId(null);
      return;
    }

    const draggedIndex = steps.findIndex(s => s.id === draggedStepId);
    const targetIndex = steps.findIndex(s => s.id === targetStepId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedStepId(null);
      return;
    }

    const newSteps = [...steps];
    const [draggedStep] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(targetIndex, 0, draggedStep);

    setSteps(newSteps);
    setDraggedStepId(null);
  };

  const handleDragEnd = () => {
    setDraggedStepId(null);
  };

  // Fonction pour basculer entre le mode simple et le mode groupes
  const toggleGroupMode = () => {
    if (useGroups) {
      // Passage au mode simple : aplatir les groupes en une liste simple
      const flattened = flattenGroupsToIngredients(ingredientGroups);
      setIngredients(flattened.length > 0 ? flattened : [{ id: `ing-0`, name: "", quantityUnit: "" }]);
      setUseGroups(false);
    } else {
      // Passage au mode groupes : envelopper les ingrédients dans un groupe par défaut
      const wrapped = wrapIngredientsInDefaultGroup(ingredients);
      setIngredientGroups(wrapped);
      setUseGroups(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Préparer les ingrédients ou groupes selon le mode
    let ingredientsData: any[] = [];
    let ingredientGroupsData: any[] | undefined = undefined;

    if (useGroups) {
      // Mode groupes : envoyer les groupes
      ingredientGroupsData = ingredientGroups
        .filter(group => group.ingredients.some(ing => ing.name.trim()))
        .map(convertGroupToApiFormat);
    } else {
      // Mode simple : envoyer les ingrédients directement
      ingredientsData = ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => {
          const { quantity, unit } = parseQuantityUnit(ing.quantityUnit);
          return {
            name: ing.name,
            quantity: quantity ? parseFloat(quantity) : null,
            unit: unit || null,
          };
        });
    }

    const formData = {
      name,
      description: description || null,
      category: category as Recipe["category"],
      author: authorField.trim() || "Anonyme",
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      preparationTime: parseInt(preparationTime) || 0,
      cookingTime: parseInt(cookingTime) || 0,
      servings: parseInt(servings) || 1,
      rating: 0, // Will be calculated from comments automatically
      costEstimate: costEstimate ? (costEstimate as "CHEAP" | "MEDIUM" | "EXPENSIVE") : null,
      tags: tags.map((t) => t.toLowerCase().trim()).filter(Boolean),
      ingredients: useGroups ? [] : ingredientsData,
      ...(useGroups && { ingredientGroups: ingredientGroupsData }),
      steps: steps
        .filter((step) => step.text.trim())
        .map((step, index) => ({
          order: index + 1,
          text: step.text,
        })),
    };

    try {
      let result;
      let recipeId;
      
      if (isEdit) {
        // Only update if it's an actual edit (not a duplication)
        result = await updateRecipe(recipe.id, formData);
        recipeId = recipe.id; // Keep the same ID for redirect
      } else {
        // Create new recipe for both new recipes and duplications
        result = await createRecipe(formData);
        recipeId = result.success ? result.data?.id : null;
      }

      if (result.success) {
        // Clear draft on successful save
        clearDraft();

        // Reset form to prevent draft restoration
        if (!recipe) {
          resetForm();
        }

        setOpen(false);
        
        // If onSuccess callback is provided (e.g., YouTube import), call it instead of redirecting
        if (onSuccess && recipeId) {
          onSuccess(recipeId);
        } else {
          // Default behavior: redirect to recipe detail page
          if (isEdit && recipeId) {
            router.push(`/recipes/${recipeId}`);
          } else if (recipeId) {
            router.push(`/recipes/${recipeId}`);
          } else {
            router.push("/recipes");
          }
        }
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
      setAuthorField("");
      setImageUrl("");
      setVideoUrl("");
      setPreparationTime("");
      setCookingTime("");
      setServings("");
      setCostEstimate("");
      setIngredients([{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }]);
      setSteps([{ id: "step-0", text: "" }]);
      setTags([]);
      clearDraft(); // Clear draft when resetting
    }
    setError(null);
    setDraftRestored(false);
  };

  const handleDialogClose = (isOpen: boolean) => {
    // Save draft BEFORE closing (while we still have current state values)
    if (!isOpen && !recipe && open) {
      console.log('[RecipeForm] Dialog closing, saving draft with current state...');
      console.log('[RecipeForm] Current ingredients:', ingredients);
      console.log('[RecipeForm] Current steps:', steps);
      saveDraftToStorage();
      // Reset mounted after saving
      setMounted(false);
    }
    
    setOpen(isOpen);
    if (!isOpen) {
      if (recipe) {
        // For edits, reset form when closing
        resetForm();
      }
      // Call onCancel callback if provided (e.g., for YouTube import)
      if (onCancel) {
        onCancel();
      }
    }
  };

  const selectedCategory = categories.find(c => c.value === category);

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl lg:max-w-5xl xl:max-w-6xl max-h-[80vh] p-0 overflow-hidden gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">
          {isYouTubeImport ? "Nouvelle recette depuis YouTube" : isDuplication ? "Dupliquer la recette" : isEdit ? "Modifier la recette" : "Nouvelle recette"}
        </DialogTitle>
        {/* Header with gradient */}
        <div className={`relative ${isYouTubeImport ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600' : 'bg-gradient-to-r from-emerald-700 via-green-500 to-teal-500'} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-semibold text-white">
                  {isYouTubeImport ? "Nouvelle recette depuis YouTube" : isDuplication ? "Dupliquer la recette" : isEdit ? "Modifier la recette" : "Nouvelle recette"}
                </h2>
                <p className="text-white/80 text-xs mt-0.5">
                  {isYouTubeImport ? "Générée automatiquement depuis une vidéo YouTube" : isDuplication ? "Créez une copie de cette recette" : isEdit ? "Mettez à jour votre création culinaire" : "Partagez votre création culinaire"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Import YouTube button - only for new recipes and admins/owners */}
              {!recipe && !isYouTubeImport && (session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
                <QuickYouTubeImport onRecipeGenerated={handleYouTubeRecipeImport} />
              )}
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
        </div>

        <ScrollArea className="max-h-[calc(80vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-start gap-3">
                <div className="p-1 bg-red-100 dark:bg-red-900/50 rounded-full">
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-red-800 dark:text-red-300 font-medium text-sm">Erreur</p>
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Draft restored message */}
            {draftRestored && !recipe && (
              <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full flex-shrink-0">
                    <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-blue-800 dark:text-blue-300 font-medium text-sm">Brouillon restauré</p>
                    <p className="text-blue-600 dark:text-blue-400 text-xs">Votre travail précédent a été récupéré automatiquement</p>
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
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs cursor-pointer w-full sm:w-auto"
                >
                  Réinitialiser le formulaire
                </Button>
              </div>
            )}

            {/* Main Grid Layout */}
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Left Column */}
              <div className="space-y-5">
                {/* Basic Info Section */}
                <SectionCard icon={Sparkles} title="Informations essentielles" color="emerald">
                  <div className="space-y-4">
                    {/* Name + Category + Anonymous in flex */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 min-w-0">
                        <Label htmlFor="name" className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 block">
                          Nom de la recette <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Blanquette de veau..."
                          required
                          className="h-10 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 focus:border-emerald-400 focus:ring-emerald-400/20 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                        />
                      </div>
                      <div className="flex gap-2 sm:flex-shrink-0">
                        <div>
                          <Label className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 block">
                            Catégorie
                          </Label>
                          <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
                            <SelectTrigger className="cursor-pointer h-10 w-40 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100">
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
                        <div className="w-full sm:w-48">
                          <Label htmlFor="authorField" className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 block">
                            Auteur
                          </Label>
                          <Input
                            id="authorField"
                            value={authorField}
                            onChange={(e) => setAuthorField(e.target.value)}
                            placeholder="Anonyme"
                            className="h-10 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 focus:border-emerald-400 focus:ring-emerald-400/20 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <Label htmlFor="description" className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 block">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Une courte description de votre recette..."
                        rows={2}
                        className="bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 focus:border-emerald-400 focus:ring-emerald-400/20 resize-none placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <Label className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
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
                <SectionCard icon={Clock} title="Temps, Portions & Coût" color="blue">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                        Préparation
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          value={preparationTime}
                          onChange={(e) => setPreparationTime(e.target.value)}
                          placeholder="—"
                          className="h-10 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 pr-10 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">min</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                        Cuisson
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          value={cookingTime}
                          onChange={(e) => setCookingTime(e.target.value)}
                          placeholder="—"
                          className="h-10 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 pr-10 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">min</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                        Portions
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={servings}
                        onChange={(e) => setServings(e.target.value)}
                        placeholder="—"
                        className="h-10 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                      />
                    </div>
                    <div>
                      <Label className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                        Coût
                      </Label>
                      <Select value={costEstimate || "none"} onValueChange={(v) => setCostEstimate(v === "none" ? "" : v)}>
                        <SelectTrigger className="cursor-pointer h-10 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100">
                          <SelectValue placeholder="—">
                            {costOptions.find(c => c.value === costEstimate)?.emoji || "—"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {costOptions.map((cost) => (
                            <SelectItem key={cost.value || "none"} value={cost.value || "none"} className="cursor-pointer">
                              <span className="flex items-center gap-2">
                                <span>{cost.emoji}</span>
                                <span>{cost.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SectionCard>

                {/* Media Section */}
                <SectionCard icon={Image} title="Médias" color="purple">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                        URL de l&apos;image
                      </Label>
                      <Input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-10 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                      />
                    </div>
                    <div>
                      <Label className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Video className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                        URL de la vidéo
                      </Label>
                      <Input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-10 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                      />
                    </div>
                  </div>
                  {/* Image Preview */}
                  {imageUrl && (
                    <div className="mt-3 relative rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-700 h-48 sm:h-56">
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
                  title={`Ingrédients ${
                    useGroups 
                      ? `(${ingredientGroups.flatMap(g => g.ingredients).filter(i => i.name.trim()).length})` 
                      : `(${ingredients.filter(i => i.name.trim()).length})`
                  }`}
                  color="emerald"
                  action={
                    <div className="flex items-center gap-2">
                      {/* Bouton pour changer de mode */}
                      {!useGroups ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={toggleGroupMode}
                          className="h-7 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer transition-all whitespace-nowrap"
                          title="Organiser les ingrédients en groupes"
                        >
                          <FolderPlus className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">Mode groupes d&apos;ingrédients</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={toggleGroupMode}
                          className="h-7 text-xs border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700/40 cursor-pointer transition-all whitespace-nowrap"
                          title="Revenir au mode simple"
                        >
                          <List className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">Mode ingrédients sans groupe</span>
                        </Button>
                      )}

                      {/* Bouton ajouter (uniquement en mode simple) */}
                      {!useGroups && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addIngredient}
                          className="h-7 text-xs border-emerald-300 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Ajouter</span>
                        </Button>
                      )}
                    </div>
                  }
                >
                  {useGroups ? (
                    // Mode groupes : utiliser le composant IngredientGroupsEditor
                    <IngredientGroupsEditor
                      groups={ingredientGroups}
                      onChange={setIngredientGroups}
                      disabled={false}
                    />
                  ) : (
                    // Mode simple : liste classique d'ingrédients
                    <div className="space-y-2">
                      {/* Header row - aligned with the inputs below */}
                      <div className="hidden sm:grid sm:grid-cols-[80px_1fr_40px] gap-2 text-xs text-stone-500 dark:text-stone-400 font-medium ml-2 mr-2">
                        <span className="text-center">Qté + Unité</span>
                        <span className="pl-1">Ingrédient</span>
                        <span></span>
                      </div>
                      {mounted && ingredients.map((ing, index) => (
                        <div
                          key={ing.id}
                          className="grid grid-cols-[70px_1fr_40px] sm:grid-cols-[80px_1fr_40px] gap-2 items-center px-2 py-2 rounded-lg bg-white dark:bg-stone-700/50 border border-stone-100 dark:border-stone-600 hover:border-emerald-200 dark:hover:border-emerald-600 transition-colors"
                        >
                          <Input
                            value={ing.quantityUnit}
                            onChange={(e) => updateIngredient(ing.id, "quantityUnit", e.target.value)}
                            placeholder="150g"
                            className="h-11 text-sm text-center bg-stone-50 dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 placeholder:text-xs placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                            title="Ex: 150g, 1 c.à.s, 2 kg, etc."
                          />
                          <Input
                            value={ing.name}
                            onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                            placeholder="Nom de l'ingrédient..."
                            className="h-11 text-sm border-stone-200 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeIngredient(ing.id)}
                            disabled={ingredients.length === 1}
                            className="h-10 w-10 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {ingredients.length === 1 && !ingredients[0].name && (
                        <p className="text-xs text-stone-400 italic text-center py-2">
                          Ajoutez les ingrédients de votre recette
                        </p>
                      )}
                    </div>
                  )}
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
                      className="h-7 text-xs border-rose-300 dark:border-rose-600 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 cursor-pointer"
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
                        draggable
                        onDragStart={(e) => handleDragStart(e, step.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, step.id)}
                        onDragEnd={handleDragEnd}
                        className={`flex gap-3 p-3 rounded-lg bg-white dark:bg-stone-700/50 border transition-all cursor-grab active:cursor-grabbing ${
                          draggedStepId === step.id
                            ? 'border-rose-400 opacity-50 scale-95 shadow-lg'
                            : 'border-stone-100 dark:border-stone-600 hover:border-rose-300 dark:hover:border-rose-500 hover:shadow-md'
                        }`}
                        title="Glisser pour réorganiser les étapes"
                      >
                        <div className="flex-shrink-0">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white text-sm font-bold shadow-sm">
                            {index + 1}
                          </span>
                        </div>
                        <Textarea
                          value={step.text}
                          onChange={(e) => {
                            updateStep(step.id, e.target.value);
                            // Auto-resize textarea
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            // Ensure correct height on focus
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          placeholder={`Décrivez l'étape ${index + 1}...`}
                          className="flex-1 text-sm border-stone-200 dark:border-stone-600 resize-none bg-stone-50 dark:bg-stone-700 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-600 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500 min-h-[80px] leading-relaxed cursor-text"
                          style={{ overflow: 'hidden' }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onDragStart={(e) => e.stopPropagation()}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(step.id)}
                          disabled={steps.length === 1}
                          className="h-10 w-10 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0 cursor-pointer disabled:opacity-30 self-start"
                        >
                          <Trash2 className="h-4 w-4" />
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
        <div className="border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              <span className="text-red-500">*</span> Champs obligatoires
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="px-5 cursor-pointer dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className="px-5 bg-gradient-to-r from-emerald-700 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md cursor-pointer"
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