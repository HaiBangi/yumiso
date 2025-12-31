/**
 * Composants internes pour le formulaire de recette
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Youtube, Loader2, AlertCircle, VideoOff } from "lucide-react";
import { FaTiktok } from "react-icons/fa";
import { isNoRetryError, isNoRetryStatusCode } from "@/lib/youtube-errors";
import { toast } from "sonner";

// ==================== SECTION CARD COMPONENT ====================

interface SectionCardProps {
  children: React.ReactNode;
  icon: React.ElementType;
  title: string;
  color: "amber" | "blue" | "purple" | "emerald" | "rose";
  action?: React.ReactNode;
}

export function SectionCard({
  children,
  icon: Icon,
  title,
  color,
  action
}: SectionCardProps) {
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

// ==================== YOUTUBE IMPORT FORM COMPONENT ====================

interface ImportFormProps {
  onClose: () => void;
  onRecipeGenerated: (recipe: any) => void;
  setIsImporting?: (value: boolean) => void;
  setImportPlatform?: (value: "youtube" | "tiktok" | null) => void;
  setImportStep?: (value: string | null) => void;
}

export function YoutubeImportFormSection({
  onClose,
  onRecipeGenerated,
  setIsImporting,
  setImportPlatform,
  setImportStep
}: ImportFormProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("URL manquante", {
        description: "Veuillez entrer un lien YouTube",
        icon: <AlertCircle className="h-5 w-5" />,
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);

    // Activer l'overlay de chargement si les props sont disponibles
    setIsImporting?.(true);
    setImportPlatform?.("youtube");
    setImportStep?.("Récupération de la transcription...");

    try {
      // Validation des différents formats d'URL YouTube
      let videoId: string | null = null;

      const standardMatch = youtubeUrl.match(
        /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/
      );

      const shortMatch = youtubeUrl.match(
        /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/
      );

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
              const errorMessage = data.error || "Erreur lors de la récupération de la transcription";

              // Ne pas retry si c'est une erreur non-retriable (400 = pas de sous-titres, etc.)
              if (isNoRetryStatusCode(transcriptRes.status)) {
                throw new Error(errorMessage);
              }

              throw new Error(errorMessage);
            }

            return await transcriptRes.json();
          } catch (err) {
            // Ne pas retry si l'erreur est non-retriable
            if (isNoRetryError(err)) {
              throw err;
            }

            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw err;
            }
          }
        }
      };

      const transcriptData = await fetchTranscriptWithRetry();
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      setImportStep?.("Génération de la recette avec l'IA...");

      const recipeRes = await fetch("/api/youtube/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: transcriptData.title,
          description: transcriptData.description,
          transcript: transcriptData.transcript,
          videoUrl: youtubeUrl,
          imageUrl: thumbnailUrl,
          author: transcriptData.author || "YouTube",
        }),
      });

      if (!recipeRes.ok) {
        const data = await recipeRes.json();
        throw new Error(data.error || "Erreur lors de la génération de la recette");
      }

      const recipeData = await recipeRes.json();
      onRecipeGenerated(recipeData.recipe);

      setYoutubeUrl("");
      onClose();
    } catch (err) {
      console.error("Erreur:", err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue";
      const errorLower = errorMessage.toLowerCase();

      // Afficher un Toast élégant selon le type d'erreur
      if (errorLower.includes("pas de sous-titres") || errorLower.includes("no subtitles")) {
        toast.error("Sous-titres indisponibles", {
          description: "Cette vidéo n'a pas de sous-titres. Essayez une autre vidéo avec des sous-titres activés.",
          icon: <VideoOff className="h-5 w-5" />,
          duration: 6000,
        });
      } else if (errorLower.includes("indisponible") || errorLower.includes("unavailable") ||
                 errorLower.includes("n'existe pas") || errorLower.includes("not found") ||
                 errorLower.includes("privée") || errorLower.includes("private")) {
        toast.error("Vidéo indisponible", {
          description: "Cette vidéo n'existe pas, est privée ou a été supprimée.",
          icon: <VideoOff className="h-5 w-5" />,
          duration: 6000,
        });
      } else if (errorMessage.includes("Format d'URL invalide")) {
        toast.error("URL invalide", {
          description: "Vérifiez le format de l'URL YouTube (youtube.com/watch?v=... ou youtu.be/...)",
          icon: <AlertCircle className="h-5 w-5" />,
          duration: 5000,
        });
      } else {
        toast.error("Erreur d'import", {
          description: errorMessage,
          icon: <AlertCircle className="h-5 w-5" />,
          duration: 5000,
        });
      }

      // Désactiver l'overlay en cas d'erreur
      setIsImporting?.(false);
      setImportPlatform?.(null);
      setImportStep?.(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/20 space-y-3">
      {/* Layout responsive : colonne sur mobile, ligne sur desktop */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Input
          type="url"
          placeholder="youtube.com/watch?v=..."
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading) {
              handleImport();
            }
            if (e.key === "Escape") {
              onClose();
            }
          }}
          className="h-10 text-sm bg-white/90 dark:bg-stone-900 placeholder:text-stone-400 dark:placeholder:text-stone-500 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-600"
          disabled={isLoading}
          autoFocus
          aria-label="URL de la vidéo YouTube"
        />
        <Button
          onClick={handleImport}
          disabled={!youtubeUrl.trim() || isLoading}
          className="bg-white hover:bg-red-50 text-red-600 dark:bg-stone-900 dark:hover:bg-red-950/20 dark:text-red-500 h-10 px-4 gap-2 font-medium"
          aria-label={isLoading ? "Importation de la vidéo YouTube en cours" : "Importer la recette depuis YouTube"}
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
    </div>
  );
}

// ==================== TIKTOK IMPORT FORM COMPONENT ====================

export function TikTokImportForm({
  onClose,
  onRecipeGenerated,
  setIsImporting,
  setImportPlatform,
  setImportStep
}: ImportFormProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    if (!videoUrl.trim()) {
      toast.error("URL manquante", {
        description: "Veuillez entrer un lien TikTok",
        icon: <AlertCircle className="h-5 w-5" />,
        duration: 4000,
      });
      return;
    }

    if (!videoUrl.includes('tiktok.com')) {
      toast.error("URL invalide", {
        description: "Utilisez un lien tiktok.com valide",
        icon: <AlertCircle className="h-5 w-5" />,
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);

    // Activer l'overlay de chargement si les props sont disponibles
    setIsImporting?.(true);
    setImportPlatform?.("tiktok");
    setImportStep?.("Extraction de la vidéo TikTok...");

    try {
      // Étape 1 : Extraire les métadonnées TikTok
      const extractRes = await fetch("/api/tiktok/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });

      if (!extractRes.ok) {
        const data = await extractRes.json();
        throw new Error(data.error || "Erreur lors de l'extraction TikTok");
      }

      const extractData = await extractRes.json();

      setImportStep?.("Génération de la recette avec l'IA...");

      // Étape 2 : Générer la recette avec ChatGPT
      const recipeRes = await fetch("/api/youtube/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: extractData.title,
          description: extractData.description,
          transcript: extractData.description,
          videoUrl: videoUrl,
          imageUrl: null, // Pas d'image pour TikTok
          author: extractData.author || "TikTok",
        }),
      });

      if (!recipeRes.ok) {
        const data = await recipeRes.json();
        throw new Error(data.error || "Erreur lors de la génération de la recette");
      }

      const recipeData = await recipeRes.json();

      setImportStep?.("Finalisation...");

      // Petit délai pour que l'utilisateur voie "Finalisation"
      await new Promise(resolve => setTimeout(resolve, 500));

      onRecipeGenerated(recipeData.recipe);

      setVideoUrl("");
      onClose();

      // Désactiver le loading après un court délai
      setTimeout(() => {
        setIsImporting?.(false);
        setImportPlatform?.(null);
        setImportStep?.(null);
      }, 300);
    } catch (err) {
      console.error("Erreur TikTok:", err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue";

      // Afficher un Toast élégant selon le type d'erreur
      if (errorMessage.includes("Format d'URL") || errorMessage.includes("invalide")) {
        toast.error("URL invalide", {
          description: "Vérifiez le format du lien TikTok",
          icon: <AlertCircle className="h-5 w-5" />,
          duration: 5000,
        });
      } else {
        toast.error("Erreur d'import TikTok", {
          description: errorMessage,
          icon: <AlertCircle className="h-5 w-5" />,
          duration: 5000,
        });
      }

      // Désactiver le loading en cas d'erreur
      setIsImporting?.(false);
      setImportPlatform?.(null);
      setImportStep?.(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/20 space-y-3">
      {/* Layout responsive : colonne sur mobile, ligne sur desktop */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Input
          type="url"
          placeholder="tiktok.com/@user/video/..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading) {
              handleImport();
            }
            if (e.key === "Escape") {
              onClose();
            }
          }}
          className="h-10 text-sm bg-white/90 dark:bg-stone-900 placeholder:text-stone-400 dark:placeholder:text-stone-500 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-600"
          disabled={isLoading}
          autoFocus
          aria-label="URL de la vidéo TikTok"
        />
        <Button
          onClick={handleImport}
          disabled={!videoUrl.trim() || isLoading}
          className="bg-black hover:bg-stone-900 text-white border border-stone-700 h-10 px-4 gap-2 font-medium"
          aria-label={isLoading ? "Importation de la vidéo TikTok en cours" : "Importer la recette depuis TikTok"}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Import...</span>
            </>
          ) : (
            <>
              <FaTiktok className="h-4 w-4 text-white" />
              <span>Importer</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
