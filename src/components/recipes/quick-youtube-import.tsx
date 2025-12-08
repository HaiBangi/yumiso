"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Youtube, Loader2, ArrowRight, X } from "lucide-react";

interface QuickYouTubeImportProps {
  onRecipeGenerated: (recipe: any) => void;
}

export function QuickYouTubeImport({ onRecipeGenerated }: QuickYouTubeImportProps) {
  const [showInput, setShowInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleImport = async () => {
    if (!youtubeUrl.trim()) {
      setError("Veuillez entrer un lien YouTube");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validation des différents formats d'URL YouTube
      let videoId: string | null = null;
      
      // Format standard: https://www.youtube.com/watch?v=VIDEO_ID
      const standardMatch = youtubeUrl.match(
        /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/
      );
      
      // Format court/mobile: https://youtu.be/VIDEO_ID
      const shortMatch = youtubeUrl.match(
        /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/
      );
      
      // Format mobile: https://m.youtube.com/watch?v=VIDEO_ID
      const mobileMatch = youtubeUrl.match(
        /^https?:\/\/m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/
      );

      if (standardMatch) {
        videoId = standardMatch[1];
      } else if (shortMatch) {
        videoId = shortMatch[1];
      } else if (mobileMatch) {
        videoId = mobileMatch[1];
      } else {
        throw new Error("Format d'URL invalide. Formats acceptés : youtube.com/watch?v=... ou youtu.be/...");
      }

      // Fonction pour récupérer la transcription avec retry
      const fetchTranscriptWithRetry = async (retries = 2): Promise<any> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const transcriptRes = await fetch("/api/youtube/transcript", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoId }),
            });

            if (!transcriptRes.ok) {
              const data = await transcriptRes.json();
              throw new Error(data.error || "Erreur lors de la récupération de la transcription");
            }

            return await transcriptRes.json();
          } catch (err) {
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              console.log(`Tentative ${attempt + 2}/${retries + 1}...`);
            } else {
              throw err;
            }
          }
        }
      };

      const transcriptData = await fetchTranscriptWithRetry();
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      const recipeRes = await fetch("/api/youtube/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: transcriptData.title,
          description: transcriptData.description,
          transcript: transcriptData.transcript,
          videoUrl: youtubeUrl,
          imageUrl: thumbnailUrl,
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
        {/* Desktop: bouton annuler (remplace le bouton initial) */}
        <Button
          onClick={() => {
            setShowInput(false);
            setYoutubeUrl("");
            setError(null);
          }}
          variant="ghost"
          size="sm"
          className="hidden sm:flex gap-1 text-white/90 hover:text-white hover:bg-white/20 h-9 px-3"
        >
          <X className="h-4 w-4" />
          <span className="text-xs">Annuler</span>
        </Button>
        
        {/* Form input container - absolute positioning sous le header */}
        <div className="absolute left-0 right-0 top-full mt-0 px-4 sm:px-6 py-3 bg-gradient-to-b from-emerald-700/80 to-transparent sm:from-transparent pointer-events-none z-10">
          <div className="flex sm:flex-row gap-2 w-full pointer-events-auto items-center">
            {/* Mobile: bouton annuler à gauche */}
            <Button
              onClick={() => {
                setShowInput(false);
                setYoutubeUrl("");
                setError(null);
              }}
              variant="ghost"
              size="icon"
              className="sm:hidden bg-white/90 hover:bg-red-50 dark:bg-stone-900/90 dark:hover:bg-red-950/20 text-stone-600 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-500 h-9 w-9 flex-shrink-0 border-2 border-stone-300 dark:border-stone-600 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            
            <Input
              type="url"
              placeholder={isMobile ? "youtu.be/dQw4w9WgXcQ" : "youtube.com/watch?v=dQw4w9WgXcQ"}
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
              className={`h-9 flex-1 text-sm bg-white dark:bg-stone-900 placeholder:text-stone-400 dark:placeholder:text-stone-500 text-stone-900 dark:text-white border-2 px-3 py-0 ${error ? 'border-red-500' : 'border-stone-300 dark:border-stone-600 focus:border-red-500'}`}
              disabled={isLoading}
              autoFocus
            />
            {/* Mobile: petit bouton icône d'envoi */}
            <Button
              onClick={handleImport}
              disabled={!youtubeUrl.trim() || isLoading}
              size="icon"
              className="sm:hidden bg-white hover:bg-red-50 dark:bg-stone-900 dark:hover:bg-red-950/20 text-red-600 dark:text-red-500 border-2 border-red-600 dark:border-red-500 h-9 w-9 flex-shrink-0 shadow-md p-0"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </Button>
            {/* Desktop: bouton avec texte blanc sur fond rouge */}
            <Button
              onClick={handleImport}
              disabled={!youtubeUrl.trim() || isLoading}
              className="hidden sm:flex bg-red-600 hover:bg-red-700 text-white h-10 px-4 gap-2 shadow-md font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Import...</span>
                </>
              ) : (
                <>
                  <Youtube className="h-4 w-4" />
                  <span>Importer</span>
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="flex items-start gap-2 p-2 mt-2 rounded-lg bg-red-50 dark:bg-red-900/90 border border-red-200 dark:border-red-800">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setShowInput(false);
                  setYoutubeUrl("");
                }}
                className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 transition-colors"
              >
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <Button
      onClick={() => setShowInput(true)}
      size="icon"
      className="bg-white hover:bg-red-50 dark:bg-stone-900 dark:hover:bg-red-950/20 text-red-600 dark:text-red-500 sm:border-0 border-2 border-red-600 dark:border-red-500 h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:gap-2 shadow-md"
    >
      <Youtube className="h-4 w-4 flex-shrink-0" />
      <span className="hidden sm:inline text-sm font-medium">Importer depuis YouTube</span>
    </Button>
  );
}