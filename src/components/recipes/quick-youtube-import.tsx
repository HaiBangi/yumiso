/**
 * Composant pour importer rapidement une recette depuis YouTube
 * Version simplifiée qui cache les étapes intermédiaires
 */

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Youtube, Loader2, X } from "lucide-react";
import { RecipeForm } from "./recipe-form";

interface QuickYouTubeImportProps {
  onClose?: () => void;
}

export function QuickYouTubeImport({ onClose }: QuickYouTubeImportProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleImport = async () => {
    if (!youtubeUrl.trim()) {
      setError("Veuillez entrer un lien YouTube");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Extraire l'ID de la vidéo
      const videoIdMatch = youtubeUrl.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      );

      if (!videoIdMatch) {
        throw new Error("Lien YouTube invalide");
      }

      const videoId = videoIdMatch[1];

      // 2. Récupérer la transcription
      const transcriptRes = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (!transcriptRes.ok) {
        const data = await transcriptRes.json();
        throw new Error(data.error || "Erreur lors de la récupération de la transcription");
      }

      const transcriptData = await transcriptRes.json();

      // 3. Générer la recette avec ChatGPT (sans montrer la transcription)
      const recipeRes = await fetch("/api/youtube/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: transcriptData.title,
          description: transcriptData.description,
          transcript: transcriptData.transcript,
          videoUrl: youtubeUrl,
          imageUrl: transcriptData.thumbnail,
        }),
      });

      if (!recipeRes.ok) {
        const data = await recipeRes.json();
        throw new Error(data.error || "Erreur lors de la génération de la recette");
      }

      const recipeData = await recipeRes.json();

      // 4. Afficher directement le formulaire avec la recette
      setGeneratedRecipe(recipeData.recipe);
      setShowForm(true);
    } catch (err) {
      console.error("Erreur:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeSaved = (recipeId: number) => {
    // Rediriger vers la recette créée
    window.location.href = `/recipes/${recipeId}`;
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setGeneratedRecipe(null);
    setYoutubeUrl("");
    setError(null);
  };

  // Si le formulaire est affiché, le montrer
  if (showForm && generatedRecipe) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
            Recette importée depuis YouTube
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <RecipeForm
          isYouTubeImport={true}
          onSuccess={handleRecipeSaved}
          onCancel={handleFormCancel}
          recipe={{
            name: generatedRecipe.name,
            description: generatedRecipe.description || null,
            category: generatedRecipe.category,
            author: generatedRecipe.author || "Chef YouTube",
            imageUrl: generatedRecipe.imageUrl || null,
            videoUrl: generatedRecipe.videoUrl || null,
            preparationTime: generatedRecipe.preparationTime || 0,
            cookingTime: generatedRecipe.cookingTime || 0,
            rating: 0, // Pas de note par défaut pour les imports YouTube
            servings: generatedRecipe.servings || 4,
            costEstimate: generatedRecipe.costEstimate || null,
            tags: generatedRecipe.tags || [],
            id: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            ingredients: (generatedRecipe.ingredients || []).map((ing: any, idx: number) => ({
              ...ing,
              id: idx + 1,
              recipeId: 0,
              order: idx,
            })),
            steps: (generatedRecipe.steps || []).map((step: any, idx: number) => ({
              ...step,
              id: idx + 1,
              recipeId: 0,
              order: step.order || idx + 1,
            })),
            ingredientGroups: generatedRecipe.ingredientGroups?.map((group: any, groupIdx: number) => ({
              id: groupIdx + 1,
              name: group.name,
              order: groupIdx,
              recipeId: 0,
              ingredients: group.ingredients.map((ing: any, ingIdx: number) => ({
                ...ing,
                id: ingIdx + 1,
                recipeId: 0,
                order: ingIdx,
                groupId: groupIdx + 1,
              })),
            })),
          }}
        />
      </div>
    );
  }

  // Sinon, afficher le champ de saisie YouTube
  return (
    <div className="space-y-4 p-4 border-2 border-dashed border-red-200 dark:border-red-900 rounded-lg bg-red-50/50 dark:bg-red-950/20">
      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
        <Youtube className="h-5 w-5" />
        <h3 className="font-semibold">Import rapide depuis YouTube</h3>
      </div>
      
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Collez un lien YouTube pour importer automatiquement une recette
      </p>

      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading) {
              handleImport();
            }
          }}
          className="flex-1"
          disabled={isLoading}
        />
        <Button
          onClick={handleImport}
          disabled={!youtubeUrl.trim() || isLoading}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Import...
            </>
          ) : (
            <>
              <Youtube className="h-4 w-4 mr-2" />
              Importer
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {isLoading && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          ⏳ Récupération de la vidéo et génération de la recette en cours...
        </p>
      )}
    </div>
  );
}
