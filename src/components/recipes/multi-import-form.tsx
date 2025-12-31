"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Link2, Sparkles, X, Loader2, CheckCircle2, XCircle } from "lucide-react";
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

interface RecipeStatus {
  url: string;
  status: 'importing' | 'done' | 'error';
  recipeName?: string;
  videoTitle?: string; // Titre de la vidéo YouTube récupéré avant l'import
  error?: string;
}

export function MultiImportForm({ onClose }: MultiImportFormProps) {
  const router = useRouter();
  const [urls, setUrls] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [recipesStatus, setRecipesStatus] = useState<RecipeStatus[]>([]);
  const [importCompleted, setImportCompleted] = useState(false);

  const parseUrls = (text: string): string[] => {
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
    setImportCompleted(false);

    // Initialiser les statuts avec récupération du titre
    const initialStatuses: RecipeStatus[] = parsedUrls.map(url => ({
      url,
      status: 'importing',
      videoTitle: 'Récupération du titre...'
    }));
    setRecipesStatus(initialStatuses);

    try {
      // Récupérer les titres des vidéos en parallèle
      const titlesPromises = parsedUrls.map(async (url, idx) => {
        try {
          // Extraire le videoId de l'URL
          const videoId = extractYoutubeVideoId(url);
          if (videoId) {
            // Appeler l'API pour récupérer juste les métadonnées
            const response = await fetch("/api/youtube/transcript", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoId, metadataOnly: true }),
            });

            if (response.ok) {
              const data = await response.json();
              return { idx, title: data.title || 'Vidéo YouTube' };
            }
          }
        } catch (error) {
          console.error(`Erreur récupération titre pour ${url}:`, error);
        }
        return { idx, title: 'Vidéo YouTube' };
      });

      const titles = await Promise.all(titlesPromises);

      // Mettre à jour les statuts avec les titres
      setRecipesStatus(prev => prev.map((recipe, idx) => ({
        ...recipe,
        videoTitle: titles[idx]?.title || recipe.videoTitle
      })));

      // Lancer l'import
      const response = await fetch("/api/recipes/multi-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: parsedUrls }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'import");
      }

      const data: {
        successful: ImportResult[];
        failed: ImportResult[];
        totalProcessed: number;
      } = await response.json();

      // Mettre à jour les statuts avec les résultats
      setRecipesStatus(prev => prev.map((recipe) => {
        const successResult = data.successful.find(r => r.url === recipe.url);
        const failedResult = data.failed.find(r => r.url === recipe.url);

        if (successResult) {
          return {
            ...recipe,
            status: 'done',
            recipeName: successResult.recipeName
          };
        } else if (failedResult) {
          return {
            ...recipe,
            status: 'error',
            error: failedResult.error
          };
        }
        return recipe;
      }));

      // Afficher les résultats
      if (data.successful.length > 0) {
        toast.success(
          `✅ ${data.successful.length} recette${data.successful.length > 1 ? 's' : ''} importée${data.successful.length > 1 ? 's' : ''} !`,
          { duration: 5000 }
        );
      }

      if (data.failed.length > 0) {
        toast.error(
          `❌ ${data.failed.length} recette${data.failed.length > 1 ? 's' : ''} en échec`,
          { duration: 5000 }
        );
      }

      // Marquer l'import comme terminé
      setIsImporting(false);
      setImportCompleted(true);
      router.refresh();

    } catch (error) {
      console.error("Erreur import:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'import");
      setIsImporting(false);
      setRecipesStatus([]);
    }
  };

  // Fonction helper pour extraire le videoId d'une URL YouTube
  const extractYoutubeVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);

      // Format: youtube.com/watch?v=VIDEO_ID
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      }

      // Format: youtu.be/VIDEO_ID
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }

      return null;
    } catch {
      return null;
    }
  };

  // Fonction pour réinitialiser le formulaire
  const handleReset = () => {
    setUrls("");
    setRecipesStatus([]);
    setImportCompleted(false);
    setIsImporting(false);
  };

  const urlCount = parseUrls(urls).length;
  const doneCount = recipesStatus.filter(r => r.status === 'done').length;
  const errorCount = recipesStatus.filter(r => r.status === 'error').length;
  const progressPercent = recipesStatus.length > 0
    ? Math.round(((doneCount + errorCount) / recipesStatus.length) * 100)
    : 0;

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
          disabled={isImporting}
          className="text-orange-700 hover:text-orange-900 dark:text-orange-300 dark:hover:text-orange-100 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-full h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Description (masquée pendant l'import) */}
      {!isImporting && (
        <div className="bg-white dark:bg-stone-800 rounded-lg p-4 mb-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm text-stone-700 dark:text-stone-300">
                Collez plusieurs liens YouTube ou TikTok (maximum 20) et importez-les tous en une seule fois !
              </p>
              <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
                <div>• Séparez les liens par des espaces, virgules ou nouvelles lignes</div>
                <div>• 3 recettes traitées en parallèle pour plus de rapidité</div>
                <div>• Progression visible pour chaque recette</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone de texte (masquée pendant l'import) */}
      {!isImporting && (
        <>
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

          <div>
            <Button
              onClick={handleImport}
              disabled={urlCount === 0 || urlCount > 20}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6 text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="mr-2 h-5 w-5" />
              Importer {urlCount} recette{urlCount > 1 ? 's' : ''}
            </Button>
          </div>
        </>
      )}

      {/* Progression pendant l'import */}
      {isImporting && recipesStatus.length > 0 && (
        <div className="space-y-4">
          {/* Barre de progression globale */}
          <div className="bg-white dark:bg-stone-800 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-orange-600 dark:text-orange-400 animate-spin" />
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  Import en cours...
                </span>
              </div>
              <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
                {doneCount + errorCount} / {recipesStatus.length}
              </span>
            </div>

            {/* Barre de progression */}
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
              <span>{progressPercent}% terminé</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  {doneCount} réussie{doneCount > 1 ? 's' : ''}
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                    {errorCount} échec{errorCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Liste des recettes */}
          <div className="space-y-2">
            {recipesStatus.map((recipe, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  recipe.status === 'done'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : recipe.status === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 animate-pulse'
                }`}
              >
                {/* Icône de statut */}
                <div className="flex-shrink-0">
                  {recipe.status === 'done' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  )}
                  {recipe.status === 'error' && (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  {recipe.status === 'importing' && (
                    <Loader2 className="h-5 w-5 text-orange-600 dark:text-orange-400 animate-spin" />
                  )}
                </div>

                {/* Informations de la recette */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                      #{idx + 1}
                    </span>
                    {recipe.recipeName ? (
                      <span className="font-medium text-stone-900 dark:text-stone-100 truncate text-sm">
                        {recipe.recipeName}
                      </span>
                    ) : recipe.videoTitle ? (
                      <span className="font-medium text-stone-700 dark:text-stone-300 truncate text-sm">
                        {recipe.videoTitle}
                      </span>
                    ) : (
                      <span className="text-stone-600 dark:text-stone-400 truncate text-xs font-mono">
                        {recipe.url.length > 50 ? recipe.url.substring(0, 50) + '...' : recipe.url}
                      </span>
                    )}
                  </div>
                  {recipe.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {recipe.error}
                    </p>
                  )}
                  {recipe.status === 'importing' && !recipe.error && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Import en cours...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Résultats de l'import terminé */}
      {importCompleted && !isImporting && recipesStatus.length > 0 && (
        <div className="space-y-4">
          {/* Résumé */}
          <div className="bg-white dark:bg-stone-800 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  Import terminé
                </span>
              </div>
              <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
                {doneCount + errorCount} / {recipesStatus.length}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {doneCount} réussite{doneCount > 1 ? 's' : ''}
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                  <XCircle className="h-4 w-4" />
                  {errorCount} échec{errorCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Liste des résultats */}
          <div className="space-y-2">
            {recipesStatus.map((recipe, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  recipe.status === 'done'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                }`}
              >
                <div className="flex-shrink-0">
                  {recipe.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                      #{idx + 1}
                    </span>
                    {recipe.recipeName ? (
                      <span className="font-medium text-stone-900 dark:text-stone-100 truncate text-sm">
                        {recipe.recipeName}
                      </span>
                    ) : recipe.videoTitle ? (
                      <span className="font-medium text-stone-700 dark:text-stone-300 truncate text-sm">
                        {recipe.videoTitle}
                      </span>
                    ) : (
                      <span className="text-stone-600 dark:text-stone-400 truncate text-xs font-mono">
                        {recipe.url.length > 50 ? recipe.url.substring(0, 50) + '...' : recipe.url}
                      </span>
                    )}
                  </div>
                  {recipe.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {recipe.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              <Upload className="mr-2 h-4 w-4" />
              Nouvel import
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
