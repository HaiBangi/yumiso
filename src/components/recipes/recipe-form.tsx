/**
 * Formulaire de recette - Composant principal refactorisé
 * Architecture modulaire pour une meilleure maintenabilité
 */

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
import { useOptimizeRecipe } from "@/hooks/use-recipe-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Trash2, ChefHat, Clock, Image, ListOrdered,
  UtensilsCrossed, ImageIcon, Video, Tag,
  Sparkles, Users, Timer, Flame, X, RotateCcw, Coins, FolderPlus, List, Youtube, Loader2, Upload,
  Eye, EyeOff, Globe, FileText
} from "lucide-react";
import { createRecipe, updateRecipe } from "@/actions/recipes";
import { TagInput } from "./tag-input";
import { IngredientGroupsEditor } from "./ingredient-groups-editor";
import { FaTiktok } from "react-icons/fa";
import { getUserPseudo } from "@/actions/users";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  convertGroupToApiFormat,
  convertDbGroupsToFormGroups,
  flattenGroupsToIngredients,
  wrapIngredientsInDefaultGroup,
  type IngredientGroupInput
} from "@/lib/ingredient-helpers";
import type { Recipe } from "@/types/recipe";

// Import des types et constantes
import {
  NEW_RECIPE_DRAFT_KEY,
  EDIT_RECIPE_DRAFT_KEY_PREFIX,
  categories,
  costOptions,
  statusOptions,
  RecipeStatus,
  parseQuantityUnit,
  combineQuantityUnit,
  getInitialIngredients,
  getInitialSteps,
  type IngredientInput,
  type StepInput,
  type RecipeFormProps,
  type DraftData,
  type RecipeStatusType,
} from "./recipe-form-types";

// Import des composants
import {
  SectionCard,
  YoutubeImportFormSection,
  TikTokImportForm,
} from "./recipe-form-components";
import { VoiceToTextImport } from "./voice-to-text-import";
import { SuccessAlert } from "@/components/ui/success-alert";
import { MultiImportForm } from "./multi-import-form";

export function RecipeForm({ recipe, trigger, isYouTubeImport = false, defaultOpen = false, hideDraftMessage = false, onSuccess, onCancel }: RecipeFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; details?: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [userPseudo, setUserPseudo] = useState<string>("Anonyme");
  const [showYouTubeImport, setShowYouTubeImport] = useState(false);
  const [showTikTokImport, setShowTikTokImport] = useState(false);
  const [showVoiceImport, setShowVoiceImport] = useState(false);
  const [showMultiImport, setShowMultiImport] = useState(false);

  const optimizeRecipeMutation = useOptimizeRecipe();
  const [isImporting, setIsImporting] = useState(false); // État pour le chargement global
  const [importStep, setImportStep] = useState<string | null>(null); // Étape actuelle de l'import
  const [importPlatform, setImportPlatform] = useState<"youtube" | "tiktok" | null>(null); // Plateforme d'import

  // Synchroniser open avec defaultOpen quand il change
  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);

  // Check if this is a duplication (recipe with id=0) or an edit (recipe with id>0)
  const isDuplication = recipe && recipe.id === 0 && !isYouTubeImport; // Not a duplication if it's from YouTube
  const isEdit = recipe && recipe.id > 0;

  // Helper function to get the appropriate draft key
  const getDraftKey = (): string => {
    if (isEdit && recipe) {
      // For editing, use a unique key per recipe ID
      return `${EDIT_RECIPE_DRAFT_KEY_PREFIX}${recipe.id}`;
    }
    // For new recipes and duplications, use the generic new recipe key
    return NEW_RECIPE_DRAFT_KEY;
  };

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
  const [caloriesPerServing, setCaloriesPerServing] = useState(recipe?.caloriesPerServing?.toString() || "");
  const [costEstimate, setCostEstimate] = useState(recipe?.costEstimate || "");
  const [status, setStatus] = useState<RecipeStatusType>(recipe?.status as RecipeStatusType || "PUBLIC");
  const [tags, setTags] = useState<string[]>(recipe?.tags || []);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [steps, setSteps] = useState<StepInput[]>([]);

  // États pour le système de groupes d'ingrédients
  const [useGroups, setUseGroups] = useState(false);
  const [ingredientGroups, setIngredientGroups] = useState<IngredientGroupInput[]>([]);
  const [categorySearch, setCategorySearch] = useState("");

  // Fonction pour remplir le formulaire avec une recette importée depuis YouTube
  const handleYouTubeRecipeImport = useCallback((importedRecipe: any) => {
    setName(importedRecipe.name || "");
    setDescription(importedRecipe.description || "");
    setCategory(importedRecipe.category || "MAIN_DISH");
    setAuthorField(importedRecipe.author || ""); // Pré-remplir l'auteur avec le nom de la chaîne
    setImageUrl(importedRecipe.imageUrl || "");
    setVideoUrl(importedRecipe.videoUrl || "");
    setPreparationTime(importedRecipe.preparationTime?.toString() || "");
    setCookingTime(importedRecipe.cookingTime?.toString() || "");
    setServings(importedRecipe.servings?.toString() || "4");
    setCaloriesPerServing(importedRecipe.caloriesPerServing?.toString() || "");
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

  // Fetch user pseudo when dialog opens (not on mount to avoid unnecessary server actions)
  useEffect(() => {
    if (open && session?.user?.id) {
      getUserPseudo(session.user.id).then(setUserPseudo);
    }
  }, [open, session?.user?.id]);

  // Auto-open dialog if no trigger is provided (YouTube to Recipe mode)
  useEffect(() => {
    if (!trigger && recipe) {
      setOpen(true);
    }
  }, [trigger, recipe]);

  // Save draft to localStorage - using refs to always get current values
  const saveDraftToStorage = () => {
    // Get the appropriate draft key based on context
    const draftKey = getDraftKey();
    const context = isEdit ? 'edit' : isDuplication ? 'duplication' : 'new';

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
      caloriesPerServing,
      costEstimate,
      tags,
      ingredients: currentIngredients,
      steps: currentSteps,
      useGroups: currentUseGroups,
      ingredientGroups: currentIngredientGroups,
      savedAt: Date.now(),
    };

    // Only save if there's meaningful content
    const hasContent = name.trim() ||
      description.trim() ||
      (currentIngredients && currentIngredients.length > 0 && currentIngredients.some(i => i.name.trim())) ||
      (currentSteps && currentSteps.length > 0 && currentSteps.some(s => s.text.trim())) ||
      (currentIngredientGroups && currentIngredientGroups.length > 0 && currentIngredientGroups.some(g => g.ingredients.some(i => i.name.trim())));

    if (hasContent) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (e) {
        // Silent fail
      }
    }
  };

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    const draftKey = isEdit && recipe ? `${EDIT_RECIPE_DRAFT_KEY_PREFIX}${recipe.id}` : NEW_RECIPE_DRAFT_KEY;
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {
      // Silent fail
    }
  }, [isEdit, recipe]);

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

    if (recipe) {
      // For editing or duplication: load from recipe first, then try to restore draft
      const draftKey = getDraftKey();

      // Déterminer si on doit utiliser le mode groupes
      const hasGroups = !!(recipe.ingredientGroups && recipe.ingredientGroups.length > 0);

      // Try to load draft for this recipe
      let draft: DraftData | null = null;
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const parsedDraft: DraftData = JSON.parse(saved);
          // Only restore if draft is less than 24 hours old
          if (Date.now() - parsedDraft.savedAt < 24 * 60 * 60 * 1000) {
            draft = parsedDraft;
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      } catch (e) {
        // Silent fail
      }

      // If we have a draft, restore from it; otherwise use recipe data
      if (draft && isEdit) {
        setName(draft.name);
        setDescription(draft.description);
        setCategory(draft.category as typeof category);
        setImageUrl(draft.imageUrl);
        setVideoUrl(draft.videoUrl);
        setPreparationTime(draft.preparationTime);
        setCookingTime(draft.cookingTime);
        setServings(draft.servings);
        setCaloriesPerServing(draft.caloriesPerServing || "");
        setCostEstimate(draft.costEstimate || "");
        setTags(draft.tags || []);

        // Restore useGroups and ingredient groups if available
        if (draft.useGroups && draft.ingredientGroups && draft.ingredientGroups.length > 0) {
          setUseGroups(true);
          setIngredientGroups(draft.ingredientGroups);
          setIngredients([{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }]);
        } else {
          setUseGroups(false);
          const draftIngredients = (draft.ingredients && draft.ingredients.length > 0)
            ? draft.ingredients.map(ing => ({
                ...ing,
                quantityUnit: ing.quantityUnit || combineQuantityUnit(ing.quantity || "", ing.unit || "")
              }))
            : [{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }];
          setIngredients(draftIngredients);
          setIngredientGroups([]);
        }

        const restoredSteps = (draft.steps && draft.steps.length > 0) ? draft.steps : [{ id: "step-0", text: "" }];
        setSteps(restoredSteps);
        setDraftRestored(true); // Show banner for restored edit draft
      } else {
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
      }

      // For duplication, reset the author to empty so it uses the current user's pseudo
      if (isDuplication) {
        setAuthorField("");
      }

      setMounted(true);
    } else {
      // For new recipe: try to restore draft first
      // Load draft directly here instead of using loadDraft callback
      const draftKey = getDraftKey();
      let draft: DraftData | null = null;

      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const parsedDraft: DraftData = JSON.parse(saved);
          // Only restore if draft is less than 24 hours old
          if (Date.now() - parsedDraft.savedAt < 24 * 60 * 60 * 1000) {
            draft = parsedDraft;
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      } catch (e) {
        // Silent fail
      }

      if (draft && (
        draft.name ||
        (draft.ingredients && draft.ingredients.some(i => i.name)) ||
        (draft.steps && draft.steps.some(s => s.text)) ||
        (draft.ingredientGroups && draft.ingredientGroups.some(g => g.ingredients.some((i: any) => i.name)))
      )) {
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
          setUseGroups(true);
          setIngredientGroups(draft.ingredientGroups);
          // Initialize empty ingredients array when using groups
          setIngredients([{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }]);
        } else {
          setUseGroups(false);
          // Handle draft ingredients with backward compatibility
          const draftIngredients = (draft.ingredients && draft.ingredients.length > 0)
            ? draft.ingredients.map(ing => ({
                ...ing,
                quantityUnit: ing.quantityUnit || combineQuantityUnit(ing.quantity || "", ing.unit || "")
              }))
            : [{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }];
          setIngredients(draftIngredients);
          // Initialize empty groups array when using simple ingredients
          setIngredientGroups([]);
        }

        const restoredSteps = (draft.steps && draft.steps.length > 0) ? draft.steps : [{ id: "step-0", text: "" }];
        setSteps(restoredSteps);
        setDraftRestored(true);
        setMounted(true);
      } else {
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

  const handleOptimizeWithAI = async () => {
    if (!name.trim()) {
      alert("Veuillez remplir au moins le nom de la recette");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Préparer les données de la recette actuelle
      const ingredientsData = useGroups
        ? flattenGroupsToIngredients(ingredientGroups).map((ing) => {
            const { quantity, unit } = parseQuantityUnit(ing.quantityUnit);
            return ing.name; // Simplifier pour l'API
          })
        : ingredients.map((ing) => ing.name);

      const stepsData = steps.map((step) => step.text);

      // Utiliser le hook React Query
      optimizeRecipeMutation.mutate({
        name,
        ingredients: ingredientsData,
        steps: stepsData,
      }, {
        onSuccess: (optimized) => {
          console.log('✅ Réponse optimisation:', optimized);

          // Vérifier que la réponse contient les données attendues
          if (!optimized || typeof optimized !== 'object') {
            throw new Error('Réponse invalide de l\'API d\'optimisation');
          }

      // Appliquer directement les modifications
      if (optimized.name) setName(optimized.name);
      if (optimized.preparationTime !== undefined) setPreparationTime(optimized.preparationTime.toString());
      if (optimized.cookingTime !== undefined) setCookingTime(optimized.cookingTime.toString());
      if (optimized.servings !== undefined) setServings(optimized.servings.toString());
      if (optimized.caloriesPerServing) setCaloriesPerServing(optimized.caloriesPerServing.toString());

      // Gérer les ingrédients (groupes ou simple liste)
      if (optimized.ingredientGroups && Array.isArray(optimized.ingredientGroups) && optimized.ingredientGroups.length > 0) {
        // La recette a été optimisée avec des groupes
        console.log('📦 Utilisation des groupes d\'ingrédients');
        setUseGroups(true);
        const formattedGroups = optimized.ingredientGroups.map((group: any, groupIdx: number) => ({
          id: `group-${Date.now()}-${groupIdx}`,
          name: group.name || 'Sans nom',
          ingredients: Array.isArray(group.ingredients) ? group.ingredients.map((ing: any, ingIdx: number) => ({
            id: `ing-${Date.now()}-${groupIdx}-${ingIdx}`,
            name: ing.name || '',
            quantity: ing.quantity?.toString() || "",
            unit: ing.unit || "",
            quantityUnit: combineQuantityUnit(ing.quantity?.toString() || "", ing.unit || ""),
          })) : [],
        }));
        setIngredientGroups(formattedGroups);
      } else if (optimized.ingredients && Array.isArray(optimized.ingredients) && optimized.ingredients.length > 0) {
        // La recette a été optimisée avec une liste simple
        console.log('📋 Utilisation d\'une liste simple d\'ingrédients');
        setUseGroups(false);
        const optimizedIngredients = optimized.ingredients.map((ing: any, index: number) => ({
          id: `ing-${Date.now()}-${index}`,
          name: ing.name || '',
          quantityUnit: combineQuantityUnit(ing.quantity?.toString() || '', ing.unit || ''),
          quantity: ing.quantity?.toString() || '',
          unit: ing.unit || '',
        }));
        setIngredients(optimizedIngredients);
      }

      // Mettre à jour les étapes
      if (optimized.steps && Array.isArray(optimized.steps) && optimized.steps.length > 0) {
        const optimizedSteps = optimized.steps.map((step: any, idx: number) => ({
          id: `step-${Date.now()}-${idx}`,
          text: step.text || '',
        }));
        setSteps(optimizedSteps);
      }

      // Notification de succès élégante
      setSuccess({
        message: "Recette optimisée avec succès !",
        details: optimized.optimizationNotes || "La recette a été améliorée et optimisée."
      });
        },
        onError: (error) => {
          console.error('❌ Erreur complète:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          setError(`Erreur lors de l'optimisation:\n${errorMessage}`);
        },
        onSettled: () => {
          setLoading(false);
        },
      });
    } catch (error) {
      // Au cas où il y a une erreur avant même d'appeler la mutation
      console.error('❌ Erreur avant mutation:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Erreur lors de la préparation:\n${errorMessage}`);
      setLoading(false);
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
      caloriesPerServing: caloriesPerServing ? parseInt(caloriesPerServing) : null,
      rating: 0, // Will be calculated from comments automatically
      costEstimate: costEstimate ? (costEstimate as "CHEAP" | "MEDIUM" | "EXPENSIVE") : null,
      status: status as "DRAFT" | "PRIVATE" | "PUBLIC",
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
      let recipeSlug;

      if (isEdit) {
        // Only update if it's an actual edit (not a duplication)
        result = await updateRecipe(recipe.id, formData);
        recipeId = recipe.id; // Keep the same ID for redirect
        recipeSlug = result.success ? result.data?.slug : recipe.slug;
      } else {
        // Create new recipe for both new recipes and duplications
        result = await createRecipe(formData);
        recipeId = result.success ? result.data?.id : null;
        recipeSlug = result.success ? result.data?.slug : null;
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
          onSuccess(recipeId, recipeSlug || undefined);
        } else {
          // Default behavior: redirect to recipe detail page using slug
          if (recipeSlug) {
            router.push(`/recipes/${recipeSlug}`);
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
      setStatus(RecipeStatus.PUBLIC);
      setIngredients([{ id: "ing-0", name: "", quantity: "", unit: "", quantityUnit: "" }]);
      setSteps([{ id: "step-0", text: "" }]);
      setTags([]);
      // Réinitialiser aussi les groupes d'ingrédients
      setUseGroups(false);
      setIngredientGroups([]);
      clearDraft(); // Clear draft when resetting
    }
    setError(null);
    setDraftRestored(false);
  };

  const handleDialogClose = (isOpen: boolean) => {
    // Save draft BEFORE closing (while we still have current state values)
    // Skip saving for YouTube imports as they don't need drafts
    if (!isOpen && open && !isYouTubeImport) {
      console.log('[RecipeForm] Dialog closing, saving draft with current state...');
      console.log('[RecipeForm] Current ingredients:', ingredients);
      console.log('[RecipeForm] Current steps:', steps);
      console.log('[RecipeForm] IsEdit:', isEdit, 'Recipe ID:', recipe?.id);
      saveDraftToStorage();
      // Reset mounted after saving
      setMounted(false);
    }

    // Reset import states when closing
    setShowYouTubeImport(false);
    setShowTikTokImport(false);
    setShowVoiceImport(false);

    setOpen(isOpen);
    if (!isOpen) {
      if (recipe && isEdit) {
        // For edits, we keep the draft but clear mounted state
        // The draft will be restored on next open
      } else if (recipe && !isEdit) {
        // For duplications, reset form when closing
        resetForm();
      }
      // Call onCancel callback if provided (e.g., for YouTube import)
      if (onCancel) {
        onCancel();
      }
    }
  };

  const selectedCategory = categories.find(c => c.value === category);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Contenu du formulaire (partagé entre Dialog et Sheet)
  const formContent = (
    <>
      {/* Success Alert */}
      {success && (
          <SuccessAlert
            message={success.message}
            details={success.details}
            onClose={() => setSuccess(null)}
            autoClose={7000}
          />
        )}

        {/* Loading Overlay - Bloque toute interaction pendant l'import */}
        {isImporting && (
          <div className="absolute inset-0 z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md flex items-center justify-center">
            <div className="max-w-md w-full px-8">
              <div className="text-center space-y-6">
                {/* Icon animé selon la plateforme */}
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full animate-ping opacity-20"></div>
                  <div className="relative bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full w-20 h-20 flex items-center justify-center shadow-lg">
                    {importPlatform === "youtube" && (
                      <Youtube className="h-10 w-10 text-white animate-pulse" />
                    )}
                    {importPlatform === "tiktok" && (
                      <FaTiktok className="h-10 w-10 text-white animate-pulse" />
                    )}
                    {!importPlatform && (
                      <Loader2 className="h-10 w-10 text-white animate-spin" />
                    )}
                  </div>
                </div>

                {/* Titre */}
                <div>
                  <h3 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2">
                    Import en cours...
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    {importStep || "Préparation de la recette..."}
                  </p>
                </div>

                {/* Barre de progression animée */}
                <div className="space-y-2">
                  <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full animate-pulse" style={{ width: "70%" }}></div>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-500">
                    ✨ La magie opère, veuillez patienter...
                  </p>
                </div>

                {/* Message informatif */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Notre IA analyse la vidéo et structure automatiquement la recette pour vous. Cela peut prendre quelques secondes.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header with gradient */}
        <div className={`sticky top-0 z-20 ${isYouTubeImport ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600' : 'bg-emerald-700'} px-4 md:px-6 py-3 md:py-4`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className="p-1.5 md:p-2 bg-white/20 backdrop-blur-sm rounded-lg shrink-0">
                <ChefHat className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-base md:text-xl font-semibold text-white truncate">
                  {isYouTubeImport ? "Nouvelle recette depuis YouTube" : isDuplication ? "Dupliquer la recette" : isEdit ? "Modifier la recette" : "Nouvelle recette"}
                </h2>
                <p className="text-white/80 text-xs mt-0.5 hidden sm:block">
                  {isYouTubeImport ? "Générée automatiquement depuis une vidéo YouTube" : isDuplication ? "Créez une copie de cette recette" : isEdit ? "Mettez à jour votre création culinaire" : "Partagez votre création culinaire"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              {/* Optimize button - only for existing recipes and OWNER/ADMIN */}
              {recipe && recipe.id > 0 && (session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleOptimizeWithAI}
                        disabled={loading || !name.trim()}
                        className="h-8 md:h-9 px-2 md:px-4 text-xs md:text-sm font-medium bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600 rounded-lg shadow-sm transition-all"
                      >
                        <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                        <span className="hidden md:inline">Optimiser</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs hidden md:block">
                      <p>Améliorer et normaliser automatiquement les ingrédients, étapes et quantités de la recette</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* Import Social buttons - only for new recipes and admins/owners */}
              {!recipe && !isYouTubeImport && (session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") && (
                <>
                  {/* YouTube Import Button - Premier bouton */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setShowYouTubeImport(!showYouTubeImport);
                      setShowTikTokImport(false);
                      setShowVoiceImport(false);
                      setShowMultiImport(false);
                    }}
                    className="h-8 md:h-9 px-2 md:px-4 text-xs md:text-sm font-medium bg-red-600 hover:bg-red-700 text-white border-0 rounded-lg shadow-sm transition-all"
                  >
                    <Youtube className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                    <span className="hidden md:inline">Import YouTube</span>
                  </Button>

                  {/* TikTok Import Button - Deuxième bouton */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setShowTikTokImport(!showTikTokImport);
                      setShowYouTubeImport(false);
                      setShowVoiceImport(false);
                      setShowMultiImport(false);
                    }}
                    className="h-8 md:h-9 px-2 md:px-4 text-xs md:text-sm font-medium bg-black hover:bg-stone-900 text-white border border-stone-700 rounded-lg shadow-sm transition-all"
                  >
                    <FaTiktok className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2 text-white" />
                    <span className="hidden md:inline">Import TikTok</span>
                  </Button>

                  {/* Voice/Text Import Button - Troisième bouton */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setShowVoiceImport(!showVoiceImport);
                      setShowYouTubeImport(false);
                      setShowTikTokImport(false);
                      setShowMultiImport(false);
                    }}
                    className="h-8 md:h-9 px-2 md:px-4 text-xs md:text-sm font-medium bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600 rounded-lg shadow-sm transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2 text-stone-700 dark:text-stone-300" />
                    <span className="hidden md:inline">Import Texte/Voix</span>
                  </Button>

                  {/* Multi Import Button - Quatrième bouton (orange) */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setShowMultiImport(!showMultiImport);
                      setShowYouTubeImport(false);
                      setShowTikTokImport(false);
                      setShowVoiceImport(false);
                    }}
                    className="h-8 md:h-9 px-2 md:px-4 text-xs md:text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white border-0 rounded-lg shadow-sm transition-all"
                  >
                    <Upload className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                    <span className="hidden md:inline">Import Multiple</span>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full h-8 w-8 md:h-10 md:w-10 shrink-0"
              >
                <X className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>

          {/* YouTube Import Form Section - shown when YouTube button is active */}
          {showYouTubeImport && !isYouTubeImport && !recipe && (
            <YoutubeImportFormSection
              onClose={() => setShowYouTubeImport(false)}
              setIsImporting={setIsImporting}
              setImportPlatform={setImportPlatform}
              setImportStep={setImportStep}
              onRecipeGenerated={(importedRecipe) => {
                setIsImporting(true);
                setImportPlatform("youtube");
                setImportStep("Traitement de la recette...");
                setTimeout(() => {
                  handleYouTubeRecipeImport(importedRecipe);
                  setTimeout(() => {
                    setIsImporting(false);
                    setImportPlatform(null);
                    setImportStep(null);
                  }, 800);
                }, 500);
              }}
            />
          )}

          {/* TikTok Import Form Section - shown when TikTok button is active */}
          {showTikTokImport && !recipe && (
            <TikTokImportForm
              onClose={() => setShowTikTokImport(false)}
              setIsImporting={setIsImporting}
              setImportPlatform={setImportPlatform}
              setImportStep={setImportStep}
              onRecipeGenerated={(importedRecipe) => {
                setIsImporting(true);
                setImportPlatform("tiktok");
                setImportStep("Traitement de la recette...");
                setTimeout(() => {
                  handleYouTubeRecipeImport(importedRecipe);
                  setTimeout(() => {
                    setIsImporting(false);
                    setImportPlatform(null);
                    setImportStep(null);
                  }, 800);
                }, 500);
              }}
            />
          )}

          {/* Multi Import Form Section - shown when Multi button is active */}
          {showMultiImport && !recipe && (
            <div className="pb-6">
              <MultiImportForm onClose={() => setShowMultiImport(false)} />
            </div>
          )}

          {/* YouTube Import Form Section - visible only in YouTube import mode (legacy) */}
          {isYouTubeImport && (
            <YoutubeImportFormSection
              onClose={() => setOpen(false)}
              onRecipeGenerated={(recipe) => {
                handleYouTubeRecipeImport(recipe);
                setOpen(false);
              }}
            />
          )}
        </div>

        {/* Main Recipe Form - hidden when multi-import is active */}
        {!showMultiImport && (
          <ScrollArea className="max-h-[calc(80vh-140px)]">
            <form onSubmit={handleSubmit} className="p-6">

            {/* Voice/Text Import Form Section - shown when Voice button is active */}
            {showVoiceImport && !recipe && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800">
                <VoiceToTextImport
                  onClose={() => setShowVoiceImport(false)}
                  setIsImporting={setIsImporting}
                  setImportPlatform={setImportPlatform}
                  setImportStep={setImportStep}
                  onRecipeGenerated={(importedRecipe) => {
                    setIsImporting(true);
                    setImportPlatform(null);
                    setImportStep("Traitement de la recette...");
                    setTimeout(() => {
                      handleYouTubeRecipeImport(importedRecipe);
                      setTimeout(() => {
                        setIsImporting(false);
                        setImportPlatform(null);
                        setImportStep(null);
                      }, 800);
                    }, 500);
                  }}
                />
              </div>
            )}

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
            {draftRestored && !hideDraftMessage && (
              <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full flex-shrink-0 animate-pulse">
                    <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-amber-800 dark:text-amber-300 font-medium text-sm">
                      💾 {isEdit ? "Modifications restaurées" : "Brouillon restauré"}
                    </p>
                    <p className="text-amber-600 dark:text-amber-400 text-xs">
                      {isEdit
                        ? "Vos modifications non sauvegardées ont été récupérées automatiquement"
                        : "Votre travail précédent a été récupéré automatiquement"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isEdit && recipe) {
                      // For edits, reload original recipe data
                      const hasGroups = !!(recipe.ingredientGroups && recipe.ingredientGroups.length > 0);
                      setUseGroups(hasGroups);
                      if (hasGroups) {
                        setIngredientGroups(convertDbGroupsToFormGroups(recipe.ingredientGroups));
                      } else {
                        setIngredients(getInitialIngredients(recipe));
                      }
                      setSteps(getInitialSteps(recipe));
                      setName(recipe.name);
                      setDescription(recipe.description || "");
                      setCategory(recipe.category);
                      setImageUrl(recipe.imageUrl || "");
                      setVideoUrl(recipe.videoUrl || "");
                      setPreparationTime(recipe.preparationTime?.toString() || "");
                      setCookingTime(recipe.cookingTime?.toString() || "");
                      setServings(recipe.servings?.toString() || "");
                      setCostEstimate(recipe.costEstimate || "");
                      setTags(recipe.tags || []);
                      setAuthorField(recipe.author || "");
                    } else {
                      // For new recipes, clear everything
                      resetForm();
                    }
                    clearDraft();
                    setDraftRestored(false);
                  }}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs cursor-pointer w-full sm:w-auto whitespace-nowrap"
                >
                  {isEdit ? "Annuler les modifications" : "Réinitialiser"}
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
                    {/* Name + Category + Author in flex */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                      <div className="flex-[2] min-w-0">
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
                      <div className="flex gap-2">
                        <div>
                          <Label className="text-stone-700 dark:text-stone-300 text-xs font-medium mb-1.5 block">
                            Catégorie
                          </Label>
                          <Select
                            value={category}
                            onValueChange={(value) => {
                              setCategory(value as typeof category);
                              setCategorySearch("");
                            }}
                          >
                            <SelectTrigger className="cursor-pointer h-9 w-40 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100">
                              <SelectValue>
                                {selectedCategory && (
                                  <span className="flex items-center gap-2">
                                    <span>{selectedCategory.emoji}</span>
                                    <span>{selectedCategory.label}</span>
                                  </span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                              {/* Input de recherche */}
                              <div className="p-2 border-b border-stone-200 dark:border-stone-700 sticky top-0 bg-white dark:bg-stone-800 z-10">
                                <Input
                                  placeholder="Rechercher..."
                                  value={categorySearch}
                                  onChange={(e) => setCategorySearch(e.target.value)}
                                  className="h-8 text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                              {categories
                                .filter((cat) =>
                                  cat.label.toLowerCase().includes(categorySearch.toLowerCase()) ||
                                  cat.value.toLowerCase().includes(categorySearch.toLowerCase())
                                )
                                .map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value} className="cursor-pointer">
                                    <span className="flex items-center gap-2">
                                      <span>{cat.emoji}</span>
                                      <span>{cat.label}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              {categories.filter((cat) =>
                                cat.label.toLowerCase().includes(categorySearch.toLowerCase()) ||
                                cat.value.toLowerCase().includes(categorySearch.toLowerCase())
                              ).length === 0 && (
                                <div className="p-2 text-sm text-stone-500 dark:text-stone-400 text-center">
                                  Aucune catégorie trouvée
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-full sm:w-32">
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
                        <Flame className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
                        Cal/portion
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={caloriesPerServing}
                        onChange={(e) => setCaloriesPerServing(e.target.value)}
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
                        <SelectTrigger className="cursor-pointer h-9 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100">
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
                        Lien de l&apos;image
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
                        Lien de la vidéo
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

                {/* Visibility/Status Section */}
                <SectionCard icon={Eye} title="Visibilité" color="blue">
                  <div className="space-y-3">
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Contrôlez qui peut voir votre recette
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setStatus(option.value as RecipeStatusType)}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            status === option.value
                              ? option.value === RecipeStatus.PUBLIC
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                                : option.value === RecipeStatus.DRAFT
                                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30"
                                : "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                              : "border-stone-200 dark:border-stone-600 hover:border-stone-300 dark:hover:border-stone-500 bg-white dark:bg-stone-700/50"
                          }`}
                        >
                          <span className="text-xl mb-1">{option.emoji}</span>
                          <span className={`text-xs font-medium ${
                            status === option.value
                              ? option.value === RecipeStatus.PUBLIC
                                ? "text-emerald-700 dark:text-emerald-300"
                                : option.value === RecipeStatus.DRAFT
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-indigo-700 dark:text-indigo-300"
                              : "text-stone-700 dark:text-stone-300"
                          }`}>
                            {option.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    {/* Status description */}
                    <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                      status === RecipeStatus.PUBLIC
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                        : status === RecipeStatus.DRAFT
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                        : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                    }`}>
                      {status === RecipeStatus.PUBLIC && <Globe className="h-3.5 w-3.5" />}
                      {status === RecipeStatus.DRAFT && <FileText className="h-3.5 w-3.5" />}
                      {status === RecipeStatus.PRIVATE && <EyeOff className="h-3.5 w-3.5" />}
                      <span>
                        {status === RecipeStatus.PUBLIC && "Cette recette sera visible par tous les utilisateurs"}
                        {status === RecipeStatus.DRAFT && "Brouillon : travaillez dessus et publiez quand vous êtes prêt"}
                        {status === RecipeStatus.PRIVATE && "Recette privée : visible uniquement par vous"}
                      </span>
                    </div>
                  </div>
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
                        className="grid grid-cols-[70px_1fr_40px] sm:grid-cols-[80px_1fr_40px] gap-2 items-center px-2 py-1.5 rounded-lg bg-white dark:bg-stone-700/50 border border-stone-100 dark:border-stone-600 hover:border-emerald-200 dark:hover:border-emerald-600 transition-colors"
                      >
                        <Input
                          value={ing.quantityUnit}
                          onChange={(e) => updateIngredient(ing.id, "quantityUnit", e.target.value)}
                          placeholder="150g"
                          className="h-8 text-sm text-center bg-stone-50 dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 placeholder:text-xs placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                          title="Ex: 150g, 1 c.à.s, 2 kg, etc."
                        />
                        <Input
                          value={ing.name}
                          onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                          placeholder="Nom de l'ingrédient..."
                          className="h-8 text-sm border-stone-200 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIngredient(ing.id)}
                          disabled={ingredients.length === 1}
                          className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer disabled:opacity-30"
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
        )}

        {/* Sticky Footer - shown only when not in multi-import mode */}
        {!showMultiImport && (
        <div className="border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                <span className="text-red-500">*</span> Champs obligatoires
              </p>
              {/* Status indicator */}
              <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                status === RecipeStatus.PUBLIC
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : status === RecipeStatus.DRAFT
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
              }`}>
                {status === RecipeStatus.PUBLIC && <Globe className="h-3 w-3" />}
                {status === RecipeStatus.DRAFT && <FileText className="h-3 w-3" />}
                {status === RecipeStatus.PRIVATE && <EyeOff className="h-3 w-3" />}
                <span>{statusOptions.find(s => s.value === status)?.label}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="px-4 cursor-pointer dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Annuler
              </Button>
              {/* Save as draft button - only show if not already in draft mode and not editing */}
              {status !== "DRAFT" && !isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    setStatus(RecipeStatus.DRAFT);
                    // Small delay to let state update
                    setTimeout(() => {
                      handleSubmit(e as any);
                    }, 50);
                  }}
                  disabled={loading || !name.trim()}
                  className="px-4 cursor-pointer border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Brouillon
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className={`px-5 shadow-md cursor-pointer ${
                  status === RecipeStatus.PUBLIC
                    ? "bg-gradient-to-r from-emerald-700 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                    : status === RecipeStatus.DRAFT
                    ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white"
                    : "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white"
                }`}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    {status === RecipeStatus.PUBLIC && <Globe className="h-4 w-4 mr-2" />}
                    {status === RecipeStatus.DRAFT && <FileText className="h-4 w-4 mr-2" />}
                    {status === RecipeStatus.PRIVATE && <EyeOff className="h-4 w-4 mr-2" />}
                    {isEdit
                      ? "Enregistrer"
                      : status === RecipeStatus.PUBLIC
                        ? "Publier"
                        : status === RecipeStatus.DRAFT
                        ? "Sauvegarder le brouillon"
                        : "Enregistrer en privé"
                    }
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        )}
    </>
  );

  // Rendu conditionnel : Sheet sur mobile, Dialog sur desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleDialogClose}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent side="bottom" className={`h-[95vh] p-0 rounded-t-3xl ${showMultiImport ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          <SheetTitle className="sr-only">
            {isYouTubeImport ? "Nouvelle recette depuis YouTube" : isDuplication ? "Dupliquer la recette" : isEdit ? "Modifier la recette" : "Nouvelle recette"}
          </SheetTitle>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={`max-w-2xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] p-0 gap-0 [&>button]:hidden ${showMultiImport ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        <DialogTitle className="sr-only">
          {isYouTubeImport ? "Nouvelle recette depuis YouTube" : isDuplication ? "Dupliquer la recette" : isEdit ? "Modifier la recette" : "Nouvelle recette"}
        </DialogTitle>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
