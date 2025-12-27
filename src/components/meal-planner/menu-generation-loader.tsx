"use client";

import { useEffect, useState } from "react";
import { Sparkles, CalendarDays, ChefHat, Utensils, Clock, Flame, Salad } from "lucide-react";

interface MenuGenerationLoaderProps {
  mealCount?: number; // Nombre de repas à générer
  useOwnRecipes?: boolean; // true = mes recettes, false = IA, undefined = mix
}

const tips = [
  "🍳 Analyse de vos préférences culinaires...",
  "📅 Planification des repas de la semaine...",
  "🥗 Équilibrage nutritionnel en cours...",
  "👨‍🍳 Notre chef virtuel prépare votre menu...",
  "🍽️ Sélection des meilleures recettes...",
  "✨ Ajout de variété à votre planning...",
  "🥘 Vérification des combinaisons de saveurs...",
  "📝 Finalisation de votre menu personnalisé...",
  "🎯 Optimisation du planning...",
];

const floatingIcons = [
  { Icon: Utensils, color: "text-orange-400" },
  { Icon: Salad, color: "text-green-400" },
  { Icon: Flame, color: "text-red-400" },
  { Icon: Clock, color: "text-blue-400" },
  { Icon: ChefHat, color: "text-amber-400" },
  { Icon: CalendarDays, color: "text-emerald-400" },
];

export function MenuGenerationLoader({ mealCount = 7, useOwnRecipes }: MenuGenerationLoaderProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Estimation du temps total basée sur :
  // - 7 repas = ~1 minute (base)
  // - 28 repas = ~5 minutes
  // - Facteur x0.5 si que mes recettes (2x plus rapide)
  // - Facteur x2 si que IA (2x plus long)
  // - Facteur x1 si mix
  const getSpeedFactor = () => {
    if (useOwnRecipes === true) return 0.5; // Mes recettes uniquement = 2x plus rapide
    if (useOwnRecipes === false) return 2; // IA uniquement = 2x plus long
    return 1; // Mix = normal
  };

  // Formule : temps = (mealCount / 7) * 60000 * speedFactor
  // 7 repas = 1 min, 14 repas = 2 min, 28 repas = ~4-5 min (avec progression non linéaire)
  const speedFactor = getSpeedFactor();
  const baseTimeMs = (mealCount / 7) * 60000;
  const estimatedTimeMs = Math.max(30000, baseTimeMs * speedFactor);
  const estimatedTimeMin = Math.round(estimatedTimeMs / 60000 * 10) / 10;

  useEffect(() => {
    const startTime = Date.now();
    
    // Rotation des tips (toutes les 5 secondes)
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);

    // Animation de progression basée sur le temps estimé
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
      
      // Progression basée sur le temps écoulé vs temps estimé
      // Atteint ~90% au temps estimé, puis ralentit fortement
      const baseProgress = (elapsed / estimatedTimeMs) * 90;
      
      // Après 90%, progression très lente (max 95%)
      let newProgress;
      if (baseProgress < 90) {
        newProgress = baseProgress;
      } else {
        // Après le temps estimé, progression logarithmique lente
        const overtime = elapsed - estimatedTimeMs;
        const slowProgress = 90 + Math.min(5, Math.log10(overtime / 1000 + 1) * 2);
        newProgress = slowProgress;
      }
      
      setProgress(Math.min(95, newProgress));
    }, 200);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, [estimatedTimeMs]);

  // Formater le temps écoulé
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  // Label du mode
  const getModeLabel = () => {
    if (useOwnRecipes === true) return "Vos recettes";
    if (useOwnRecipes === false) return "Recettes IA";
    return "Mix";
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[450px] sm:min-h-[550px] py-8 px-4 overflow-hidden rounded-lg">
      {/* Fond avec gradient animé */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/50 dark:via-orange-950/50 dark:to-rose-950/50 rounded-lg" />
      
      {/* Particules flottantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map(({ Icon, color }, index) => (
          <div
            key={index}
            className={`absolute animate-float-slow opacity-20 dark:opacity-10 ${color}`}
            style={{
              left: `${10 + (index * 15) % 80}%`,
              top: `${15 + (index * 20) % 70}%`,
              animationDelay: `${index * 0.8}s`,
              animationDuration: `${7 + index * 0.5}s`,
            }}
          >
            <Icon className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
        ))}
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
        {/* Icône principale animée */}
        <div className="relative mb-6 sm:mb-8">
          {/* Cercles concentriques animés */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-amber-200 dark:border-amber-800 animate-ping opacity-20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-orange-300 dark:border-orange-700 animate-pulse" />
          </div>
          
          {/* Conteneur de l'icône avec rotation */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full opacity-80 blur-sm" />
            <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-full p-4 sm:p-5 shadow-2xl">
              <CalendarDays className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
          </div>

          {/* Étoiles scintillantes autour */}
          <div className="absolute -top-2 -right-2 animate-bounce" style={{ animationDelay: '0s' }}>
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
          </div>
          <div className="absolute -bottom-1 -left-3 animate-bounce" style={{ animationDelay: '0.3s' }}>
            <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" />
          </div>
          <div className="absolute top-1/2 -right-4 animate-bounce" style={{ animationDelay: '0.6s' }}>
            <Utensils className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400" />
          </div>
        </div>

        {/* Titre */}
        <h3 className="text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-200 mb-2 sm:mb-3">
          🍽️ Génération du menu...
        </h3>
        
        {/* Sous-titre */}
        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 mb-4 sm:mb-6 px-4">
          Notre chef virtuel prépare {mealCount} repas pour votre semaine
        </p>

        {/* Badge du mode */}
        <div className="mb-4 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 rounded-full border border-amber-200 dark:border-amber-800">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Mode : {getModeLabel()}
          </span>
        </div>

        {/* Barre de progression */}
        <div className="w-full max-w-xs sm:max-w-sm mb-4 sm:mb-6 px-4">
          <div className="h-2 sm:h-3 bg-amber-100 dark:bg-amber-900/50 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400 rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Effet brillant sur la barre */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-500 mt-2 text-center">
            {Math.round(progress)}% complété
          </p>
        </div>

        {/* Tips rotatifs */}
        <div className="min-h-[48px] sm:min-h-[56px] flex items-center justify-center px-4">
          <div 
            key={currentTip}
            className="animate-fade-in-up"
          >
            <p className="text-sm sm:text-base font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-4 py-2 sm:px-6 sm:py-3 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm">
              {tips[currentTip]}
            </p>
          </div>
        </div>

        {/* Message de patience */}
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-500 mt-4 sm:mt-6">
          Temps estimé : ~{estimatedTimeMin} min • Écoulé : {formatTime(elapsedTime)}
        </p>

        {/* Animation de points */}
        <div className="flex gap-1.5 mt-3">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}
