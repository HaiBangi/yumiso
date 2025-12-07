"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Youtube, Loader2 } from "lucide-react";

interface QuickYouTubeImportProps {
  onRecipeGenerated: (recipe: any) => void;
}

export function QuickYouTubeImport({ onRecipeGenerated }: QuickYouTubeImportProps) {
  const [showInput, setShowInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!youtubeUrl.trim()) {
      setError("Veuillez entrer un lien YouTube");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const videoIdMatch = youtubeUrl.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      );

      if (!videoIdMatch) {
        throw new Error("Lien YouTube invalide");
      }

      const videoId = videoIdMatch[1];

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

      onRecipeGenerated(recipeData.recipe);
      
      setYoutubeUrl("");
      setShowInput(false);
      setError(null);
    } catch (err) {
      console.error("Erreur:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  if (showInput) {
    return (
      <>
        <Input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading) {
              handleImport();
            }
            if (e.key === "Escape") {
              setShowInput(false);
              setYoutubeUrl("");
              setError(null);
            }
          }}
          className="h-10 flex-1 max-w-xs"
          disabled={isLoading}
          autoFocus
        />
        <Button
          onClick={handleImport}
          disabled={!youtubeUrl.trim() || isLoading}
          className="bg-red-600 hover:bg-red-700 text-white h-10"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="hidden sm:inline">Import...</span>
            </>
          ) : (
            <>
              <Youtube className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Importer</span>
            </>
          )}
        </Button>
        {error && (
          <p className="absolute top-full left-0 mt-1 text-sm text-red-200">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <Button
      onClick={() => setShowInput(true)}
      variant="outline"
      className="gap-2 bg-white dark:bg-stone-900 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 h-10"
    >
      <Youtube className="h-4 w-4" />
      <span className="hidden sm:inline">Import YouTube</span>
    </Button>
  );
}
