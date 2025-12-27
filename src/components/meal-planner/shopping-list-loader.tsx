"use client";

import { useEffect, useState } from "react";
import { Sparkles, ShoppingCart, ChefHat, Carrot, Apple, Beef, Milk, Coffee } from "lucide-react";

interface ShoppingListLoaderProps {
  itemCount?: number; // Nombre d'articles à optimiser
}

const tips = [
  "🥕 Regroupement des ingrédients similaires...",
  "🧮 Calcul des quantités totales...",
  "📊 Optimisation par catégorie...",
  "🛒 Organisation de votre liste...",
  "✨ Ajout de la touche magique...",
  "🍳 Notre chef virtuel travaille dur...",
  "📝 Vérification des doublons...",
  "🔢 Conversion des unités...",
  "🎯 Finalisation de votre liste parfaite...",
];

const floatingIcons = [
  { Icon: Carrot, color: "text-orange-400" },
  { Icon: Apple, color: "text-red-400" },
  { Icon: Beef, color: "text-rose-400" },
  { Icon: Milk, color: "text-blue-200" },
  { Icon: Coffee, color: "text-amber-600" },
  { Icon: ShoppingCart, color: "text-emerald-400" },
  { Icon: ChefHat, color: "text-white" },
];

export function ShoppingListLoader({ itemCount = 20 }: ShoppingListLoaderProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Estimation du temps total : ~30s pour 20 ingrédients (optimisé), minimum 15s
  const estimatedTimeMs = Math.max(15000, (itemCount / 20) * 30000);
  
  // Formater le temps en "Xmin Ys" (industry standard)
  const formatTimeDisplay = (ms: number) => {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    }
    return `${seconds}s`;
  };
  
  const estimatedTimeFormatted = formatTimeDisplay(estimatedTimeMs);

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

  // Formater le temps écoulé (même format que estimé)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[400px] sm:min-h-[500px] py-8 px-4 overflow-hidden">
      {/* Fond avec gradient animé */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-teal-950/50" />
      
      {/* Particules flottantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map(({ Icon, color }, index) => (
          <div
            key={index}
            className={`absolute animate-float-slow opacity-20 dark:opacity-10 ${color}`}
            style={{
              left: `${10 + (index * 12) % 80}%`,
              top: `${15 + (index * 17) % 70}%`,
              animationDelay: `${index * 0.7}s`,
              animationDuration: `${6 + index * 0.5}s`,
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
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-emerald-200 dark:border-emerald-800 animate-ping opacity-20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-emerald-300 dark:border-emerald-700 animate-pulse" />
          </div>
          
          {/* Conteneur de l'icône avec rotation */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full opacity-80 blur-sm" />
            <div className="relative bg-gradient-to-br from-emerald-500 to-green-600 rounded-full p-4 sm:p-5 shadow-2xl">
              <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
          </div>

          {/* Étoiles scintillantes autour */}
          <div className="absolute -top-2 -right-2 animate-bounce" style={{ animationDelay: '0s' }}>
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
          </div>
          <div className="absolute -bottom-1 -left-3 animate-bounce" style={{ animationDelay: '0.3s' }}>
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" />
          </div>
          <div className="absolute top-1/2 -right-4 animate-bounce" style={{ animationDelay: '0.6s' }}>
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-teal-400" />
          </div>
        </div>

        {/* Titre */}
        <h3 className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-2 sm:mb-3">
          ✨ Optimisation en cours...
        </h3>
        
        {/* Sous-titre */}
        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 mb-4 sm:mb-6 px-4">
          Notre chef virtuel analyse vos recettes et prépare votre liste de courses parfaite
        </p>

        {/* Barre de progression */}
        <div className="w-full max-w-xs sm:max-w-sm mb-4 sm:mb-6 px-4">
          <div className="h-2 sm:h-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 rounded-full transition-all duration-500 ease-out relative"
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
            <p className="text-sm sm:text-base font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 sm:px-6 sm:py-3 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm">
              {tips[currentTip]}
            </p>
          </div>
        </div>

        {/* Message de patience */}
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-500 mt-4 sm:mt-6">
          Temps estimé : ~{estimatedTimeFormatted} • Écoulé : {formatTime(elapsedTime)}
        </p>

        {/* Animation de points */}
        <div className="flex gap-1.5 mt-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}
