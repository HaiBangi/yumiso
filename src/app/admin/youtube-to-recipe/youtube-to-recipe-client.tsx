"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [hasUnsavedRecipe, setHasUnsavedRecipe] = useState(false);
  const [formKey, setFormKey] = useState(0); // Pour forcer le remontage du formulaire

  const handleRecipeSaved = (recipeId: number) => {
    // Clear the unsaved recipe flag
    setHasUnsavedRecipe(false);
    setGeneratedRecipe(null);
    setVideoInfo(null);
    setYoutubeUrl("");
    setShowRecipeForm(false);
    
    // Redirect to the newly created recipe
    router.push(`/recipes/${recipeId}`);
  };

  const handleRecipeCancel = () => {
    // Le dialog a été fermé sans sauvegarder
    setShowRecipeForm(false);
    // On garde hasUnsavedRecipe à true pour afficher le bouton de reprise
  };

  // Debug logs
  useEffect(() => {
    console.log('[YouTube Client] State changed:', { 
      showRecipeForm, 
      hasUnsavedRecipe, 
      hasGeneratedRecipe: !!generatedRecipe,
      shouldShowButton: !showRecipeForm && hasUnsavedRecipe && !!generatedRecipe,
      recipeName: generatedRecipe?.name
    });
  }, [showRecipeForm, hasUnsavedRecipe, generatedRecipe]);

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
      setHasUnsavedRecipe(true);
      setFormKey(prev => prev + 1); // Force le montage du formulaire
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  return (
    <>
      {/* Content */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
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
<Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <Sparkles className="h-5 w-5" />
                    Transcription récupérée
                  </CardTitle>
                  <CardDescription>{videoInfo.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
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
                    className="w-full h-12 mt-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
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

            {/* Bouton pour reprendre l'édition - toujours visible une fois la recette générée */}
            {hasUnsavedRecipe && generatedRecipe && (
              <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                          Recette non sauvegardée
                        </h3>
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          Vous avez généré une recette &quot;{generatedRecipe.name}&quot; mais ne l&apos;avez pas encore enregistrée.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGeneratedRecipe(null);
                          setHasUnsavedRecipe(false);
                          setVideoInfo(null);
                          setYoutubeUrl("");
                        }}
                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400"
                      >
                        Ignorer
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowRecipeForm(true);
                          setFormKey(prev => prev + 1); // Force le remontage du formulaire
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <ChefHat className="mr-2 h-4 w-4" />
                        Reprendre l&apos;édition
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading Card pendant la génération */}
            {isGeneratingRecipe && (
              <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                      <Loader2 className="h-12 w-12 text-red-600 dark:text-red-400 animate-spin" />
                      <Sparkles className="h-6 w-6 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="font-semibold text-red-800 dark:text-red-300">
                        Génération de la recette en cours...
                      </h3>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        ChatGPT analyse la transcription et crée une recette structurée
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-red-500 dark:text-red-500">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: "0.2s" }} />
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

        {/* Section du formulaire - affichée seulement quand showRecipeForm est true */}
        {showRecipeForm && generatedRecipe && (
          <div className="max-w-6xl mx-auto pb-8">
            <RecipeForm
              key={`youtube-recipe-${formKey}`}
              isYouTubeImport={true}
              onSuccess={handleRecipeSaved}
              onCancel={handleRecipeCancel}
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
        )}
      </div>
    </>
  );
}
