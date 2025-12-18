"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Link2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MultiImportFormProps {
  onClose: () => void;
}

interface ImportResult {
  success: boolean;
  recipeName?: string;
  url: string;
  error?: string;
}

export function MultiImportForm({ onClose }: MultiImportFormProps) {
  const router = useRouter();
  const [urls, setUrls] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const parseUrls = (text: string): string[] => {
    // Séparer par virgule, espace, nouvelle ligne, etc.
    const urlPattern = /(https?:\/\/[^\s,;]+)/g;
    const matches = text.match(urlPattern);
    return matches ? [...new Set(matches)] : [];
  };

  const handleImport = async () => {
    const parsedUrls = parseUrls(urls);

    if (parsedUrls.length === 0) {
      toast.error("Aucune URL valide trouvée");
      return;
    }

    if (parsedUrls.length > 20) {
      toast.error("Maximum 20 recettes par import");
      return;
    }

    setIsImporting(true);
    setProgress({ current: 0, total: parsedUrls.length });

    try {
      const response = await fetch("/api/recipes/multi-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: parsedUrls }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l&apos;import");
      }

      const data: {
        successful: ImportResult[];
        failed: ImportResult[];
        totalProcessed: number;
      } = await response.json();

      // Afficher les résultats
      if (data.successful.length > 0) {
        const recipeNames = data.successful
          .map((r) => r.recipeName)
          .filter(Boolean)
          .join(", ");

        toast.success(
          <div className="space-y-2">
            <div className="font-semibold">
              ✅ {data.successful.length} recette{data.successful.length > 1 ? "s" : ""} importée
              {data.successful.length > 1 ? "s" : ""} avec succès !
            </div>
            {recipeNames && (
              <div className="text-sm text-stone-600 dark:text-stone-400 max-h-32 overflow-y-auto">
                {recipeNames}
              </div>
            )}
          </div>,
          { duration: 5000 }
        );
      }

      if (data.failed.length > 0) {
        const failedList = data.failed
          .map((r) => {
            const shortUrl = r.url.length > 50 ? r.url.substring(0, 50) + "..." : r.url;
            return `• ${shortUrl}: ${r.error}`;
          })
          .join("\n");

        toast.error(
          <div className="space-y-2">
            <div className="font-semibold">
              ❌ {data.failed.length} recette{data.failed.length > 1 ? "s" : ""} non importée
              {data.failed.length > 1 ? "s" : ""}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
              {failedList}
            </div>
          </div>,
          { duration: 8000 }
        );
      }

      // Fermer le formulaire et rafraîchir
      setUrls("");
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Erreur import:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l&apos;import");
    } finally {
      setIsImporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const urlCount = parseUrls(urls).length;

  return (
    <div className="mt-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4 md:p-6 shadow-lg">
      {/* Header avec bouton fermer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-600 rounded-lg">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 text-lg">
              Import Multiple
            </h3>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Jusqu&apos;à 20 recettes YouTube ou TikTok
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-orange-700 hover:text-orange-900 dark:text-orange-300 dark:hover:text-orange-100 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-full h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-stone-800 rounded-lg p-4 mb-4 border border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Collez plusieurs liens YouTube ou TikTok (maximum 20) et importez-les tous en une seule fois !
            </p>
            <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
              <div>• Séparez les liens par des espaces, virgules ou nouvelles lignes</div>
              <div>• Les doublons sont automatiquement supprimés</div>
              <div>• L&apos;import peut prendre quelques minutes (~2s par recette)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Zone de texte */}
      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Collez vos liens ici
        </label>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="https://youtube.com/watch?v=...&#10;https://tiktok.com/@user/video/...&#10;https://youtube.com/watch?v=..."
          className="w-full min-h-[150px] px-4 py-3 rounded-lg border-2 border-orange-300 dark:border-orange-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent resize-y font-mono text-sm"
          disabled={isImporting}
        />
        {urlCount > 0 && (
          <div className="text-sm flex items-center justify-between">
            <span className="text-stone-600 dark:text-stone-400">
              {urlCount} lien{urlCount > 1 ? "s" : ""} détecté{urlCount > 1 ? "s" : ""}
            </span>
            {urlCount > 20 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                Maximum 20 recettes
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progression */}
      {isImporting && progress.total > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-700 dark:text-orange-300">
              Import en cours...
            </span>
            <span className="font-medium text-orange-900 dark:text-orange-100">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="h-2 bg-orange-200 dark:bg-orange-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-600 dark:bg-orange-500 transition-all duration-300 rounded-full"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-3">
        <Button
          onClick={handleImport}
          disabled={isImporting || urlCount === 0 || urlCount > 20}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6 text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Import en cours... ({progress.current}/{progress.total})
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Tout importer ({urlCount})
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isImporting}
          className="px-6 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30"
        >
          Annuler
        </Button>
      </div>

      {/* Exemples */}
      <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
        <div className="text-xs text-stone-500 dark:text-stone-400 space-y-2">
          <div className="font-medium">Formats acceptés :</div>
          <div className="space-y-1 font-mono text-[10px]">
            <div>• YouTube: youtube.com/watch?v=... ou youtu.be/...</div>
            <div>• TikTok: tiktok.com/@user/video/...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
