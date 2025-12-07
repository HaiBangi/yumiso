"use client";

import { useState } from "react";
import { Youtube, Loader2, Sparkles, ChefHat, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RecipeForm } from "@/components/recipes/recipe-form";
import type { RecipeCreateInput } from "@/types/recipe";

interface VideoInfo {
  title: string;
  description: string;
  transcript: string;
}

interface GeneratedRecipe extends RecipeCreateInput {
  ingredientGroups?: Array<{
    name: string;
    ingredients: Array<{
      name: string;
      quantity: number | null;
      unit: string | null;
    }>;
  }>;
}

export function YoutubeToRecipeClient() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRecipeForm, setShowRecipeForm] = useState(false);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleFetchTranscript = async () => {
    setError(null);
    setVideoInfo(null);
    setGeneratedRecipe(null);
    setShowRecipeForm(false);

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setError("URL YouTube invalide. Veuillez entrer une URL valide.");
      return;
    }

    setIsLoadingTranscript(true);

    try {
      const response = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la récupération de la transcription");
      }

      setVideoInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!videoInfo) return;

    setError(null);
    setIsGeneratingRecipe(true);

    // Extraire le videoId pour générer les URLs
    const videoId = extractVideoId(youtubeUrl);
    const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : youtubeUrl;
    const imageUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

    try {
      const response = await fetch("/api/youtube/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: videoInfo.title,
          description: videoInfo.description,
          transcript: videoInfo.transcript,
          videoUrl,
          imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la génération de la recette");
      }

      // S'assurer que videoUrl et imageUrl sont bien dans la recette générée
      setGeneratedRecipe({
        ...data.recipe,
        videoUrl,
        imageUrl,
      });
      setShowRecipeForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-900 dark:to-green-900 text-white py-12">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Youtube className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold font-serif">YouTube to Recipe</h1>
              <p className="text-emerald-100 mt-1">Convertir une vidéo YouTube en recette structurée</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
        {!showRecipeForm ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Input Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-500" />
                  Lien YouTube
                </CardTitle>
                <CardDescription>
                  Collez le lien d&apos;une vidéo YouTube de recette pour récupérer la transcription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isLoadingTranscript) {
                        handleFetchTranscript();
                      }
                    }}
                    className="flex-1 h-12 dark:bg-stone-800 dark:border-stone-700"
                    disabled={isLoadingTranscript || isGeneratingRecipe}
                  />
                  <Button
                    onClick={handleFetchTranscript}
                    disabled={!youtubeUrl || isLoadingTranscript || isGeneratingRecipe}
                    className="h-12 px-6 bg-red-600 hover:bg-red-700"
                  >
                    {isLoadingTranscript ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Youtube className="mr-2 h-4 w-4" />
                        Récupérer
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Video Info Card */}
            {videoInfo && (
              <Card className="border-emerald-200 dark:border-emerald-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="h-5 w-5" />
                    Transcription récupérée
                  </CardTitle>
                  <CardDescription>{videoInfo.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm text-stone-700 dark:text-stone-300">Description</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap line-clamp-4">
                      {videoInfo.description || "Aucune description disponible"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm text-stone-700 dark:text-stone-300">
                      Transcription ({videoInfo.transcript.length} caractères)
                    </h3>
                    <div className="bg-stone-50 dark:bg-stone-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap">
                        {videoInfo.transcript.slice(0, 500)}
                        {videoInfo.transcript.length > 500 && "..."}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateRecipe}
                    disabled={isGeneratingRecipe}
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  >
                    {isGeneratingRecipe ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Génération en cours avec ChatGPT...
                      </>
                    ) : (
                      <>
                        <ChefHat className="mr-2 h-5 w-5" />
                        Générer la recette avec IA
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-200 space-y-2">
                    <p className="font-semibold">Comment ça fonctionne ?</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
                      <li>Collez un lien YouTube de recette</li>
                      <li>La transcription et description sont récupérées automatiquement</li>
                      <li>ChatGPT analyse le contenu et génère une recette structurée</li>
                      <li>Vous pouvez modifier la recette avant de l&apos;enregistrer</li>
                    </ol>
                    <p className="text-xs mt-2 text-blue-700 dark:text-blue-400">
                      Note: Une clé API YouTube et OpenAI sont nécessaires pour cette fonctionnalité.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto pb-8">
            <Card className="mb-6 border-emerald-200 dark:border-emerald-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="h-5 w-5" />
                  Recette générée par IA
                </CardTitle>
                <CardDescription>
                  La recette a été générée automatiquement. Vous pouvez la modifier avant de l&apos;enregistrer.
                </CardDescription>
              </CardHeader>
            </Card>

            {generatedRecipe ? (
              <div>
                <div className="mb-4 flex gap-2 justify-between items-center">
                  <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
                    Vérifiez et modifiez la recette avant de l&apos;enregistrer
                  </h3>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRecipeForm(false);
                      setGeneratedRecipe(null);
                      setVideoInfo(null);
                      setYoutubeUrl("");
                    }}
                  >
                    Annuler
                  </Button>
                </div>
                <RecipeForm
                  recipe={{
                    name: generatedRecipe.name,
                    description: generatedRecipe.description || null,
                    category: generatedRecipe.category,
                    author: generatedRecipe.author || "Chef YouTube",
                    imageUrl: generatedRecipe.imageUrl || null,
                    videoUrl: generatedRecipe.videoUrl || null,
                    preparationTime: generatedRecipe.preparationTime || 0,
                    cookingTime: generatedRecipe.cookingTime || 0,
                    rating: generatedRecipe.rating || 0,
                    servings: generatedRecipe.servings || 4,
                    costEstimate: generatedRecipe.costEstimate || null,
                    tags: generatedRecipe.tags || [],
                    id: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    ingredients: (generatedRecipe.ingredients || []).map((ing, idx) => ({
                      ...ing,
                      id: idx + 1,
                      recipeId: 0,
                      order: idx,
                    })),
                    steps: (generatedRecipe.steps || []).map((step, idx) => ({
                      ...step,
                      id: idx + 1,
                      recipeId: 0,
                      order: step.order || idx + 1,
                    })),
                    ingredientGroups: generatedRecipe.ingredientGroups?.map((group, groupIdx) => ({
                      id: groupIdx + 1,
                      name: group.name,
                      order: groupIdx,
                      recipeId: 0,
                      ingredients: group.ingredients.map((ing, ingIdx) => ({
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
            ) : (
              <div className="text-center py-8 text-stone-500 dark:text-stone-400">
                <p>Erreur : La recette n&apos;a pas pu être générée.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRecipeForm(false);
                    setVideoInfo(null);
                  }}
                  className="mt-4"
                >
                  Retour
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
