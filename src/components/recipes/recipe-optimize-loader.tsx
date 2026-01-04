"use client";

import { useEffect, useState } from "react";
import { Sparkles, ChefHat, Utensils, Wand2, ListChecks, FileText, Timer, Scale } from "lucide-react";

const tips = [
  "🔍 Analyse des ingrédients en cours...",
  "📏 Normalisation des quantités et unités...",
  "📝 Restructuration des étapes de préparation...",
  "👨‍🍳 Notre chef virtuel perfectionne votre recette...",
  "✨ Ajout de précisions professionnelles...",
  "🎯 Optimisation de la clarté des instructions...",
  "🥄 Standardisation des abréviations culinaires...",
  "📋 Finalisation de la recette optimisée...",
];

const floatingIcons = [
  { Icon: Utensils, color: "text-violet-400" },
  { Icon: ListChecks, color: "text-purple-400" },
  { Icon: Scale, color: "text-indigo-400" },
  { Icon: Timer, color: "text-fuchsia-400" },
  { Icon: ChefHat, color: "text-pink-400" },
  { Icon: FileText, color: "text-violet-400" },
];

interface RecipeOptimizeLoaderProps {
  recipeName?: string;
}

export function RecipeOptimizeLoader({ recipeName }: RecipeOptimizeLoaderProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const estimatedTimeMs = 15000; // ~15 secondes estimées

    // Rotation des tips (toutes les 2.5 secondes)
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 2500);

    // Animation de progression
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const baseProgress = (elapsed / estimatedTimeMs) * 85;

      let newProgress;
      if (baseProgress < 85) {
        newProgress = baseProgress;
      } else {
        const overtime = elapsed - estimatedTimeMs;
        const slowProgress = 85 + Math.min(10, Math.log10(overtime / 1000 + 1) * 3);
        newProgress = slowProgress;
      }

      setProgress(Math.min(95, newProgress));
    }, 150);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-white/98 dark:bg-stone-900/98 backdrop-blur-md flex items-center justify-center overflow-hidden">
      {/* Fond avec gradient animé */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-fuchsia-950/30" />

      {/* Particules flottantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map(({ Icon, color }, index) => (
          <div
            key={index}
            className={`absolute animate-float-slow opacity-15 dark:opacity-10 ${color}`}
            style={{
              left: `${10 + (index * 15) % 80}%`,
              top: `${15 + (index * 20) % 70}%`,
              animationDelay: `${index * 0.7}s`,
              animationDuration: `${6 + index * 0.4}s`,
            }}
          >
            <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
        ))}
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto px-6">
        {/* Icône principale animée */}
        <div className="relative mb-6">
          {/* Cercles concentriques animés */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full border-4 border-violet-200 dark:border-violet-800 animate-ping opacity-20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-2 border-purple-300 dark:border-purple-700 animate-pulse" />
          </div>

          {/* Conteneur de l'icône avec rotation */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full opacity-80 blur-sm animate-pulse" />
            <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 rounded-full p-4 shadow-2xl">
              <Wand2 className="h-10 w-10 text-white animate-pulse" />
            </div>
          </div>

          {/* Étoiles scintillantes autour */}
          <div className="absolute -top-1 -right-1 animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.5s' }}>
            <Sparkles className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="absolute -bottom-2 -left-2 animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.8s' }}>
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div className="absolute top-1/2 -right-3 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '1.6s' }}>
            <Sparkles className="h-3 w-3 text-purple-400" />
          </div>
        </div>

        {/* Titre */}
        <h3 className="text-xl font-bold text-violet-800 dark:text-violet-200 mb-2">
          ✨ Optimisation en cours...
        </h3>

        {/* Sous-titre avec nom de recette */}
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-5 px-4">
          {recipeName ? (
            <>Notre chef IA perfectionne &ldquo;<span className="font-medium text-violet-600 dark:text-violet-400">{recipeName}</span>&rdquo;</>
          ) : (
            "Notre chef IA perfectionne votre recette"
          )}
        </p>

        {/* Barre de progression */}
        <div className="w-full max-w-xs mb-5">
          <div className="h-2.5 bg-violet-100 dark:bg-violet-900/50 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Effet brillant sur la barre */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-500 mt-2 text-center">
            {Math.round(progress)}% complété
          </p>
        </div>

        {/* Tips rotatifs */}
        <div className="min-h-[52px] flex items-center justify-center">
          <div
            key={currentTip}
            className="animate-fade-in-up"
          >
            <p className="text-sm font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/30 px-5 py-2.5 rounded-full border border-violet-200 dark:border-violet-800 shadow-sm">
              {tips[currentTip]}
            </p>
          </div>
        </div>

        {/* Message informatif */}
        <div className="mt-5 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 max-w-sm">
          <p className="text-xs text-violet-700 dark:text-violet-300 flex items-start gap-2">
            <ChefHat className="h-4 w-4 flex-shrink-0 mt-0.5 text-violet-500" />
            <span>L&apos;IA analyse et restructure les ingrédients, normalise les unités et améliore la clarté des étapes pour une recette professionnelle.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
