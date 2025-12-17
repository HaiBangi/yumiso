/**
 * Bannière d'installation PWA
 * S'affiche uniquement sur iOS Safari et invite l'utilisateur à installer l'app
 */

"use client";

import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Vérifier si on est sur iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Vérifier si l'app est déjà installée (mode standalone)
    const isInStandaloneMode = 
      ('standalone' in window.navigator && (window.navigator as any).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInStandaloneMode);

    // Vérifier si l'utilisateur a déjà fermé la bannière
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate 
      ? Math.floor((Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Afficher la bannière si :
    // - On est sur iOS
    // - Pas en mode standalone
    // - Pas fermée récemment (ou fermée il y a plus de 7 jours)
    if (isIOSDevice && !isInStandaloneMode && daysSinceDismissed > 7) {
      // Attendre 2 secondes avant d'afficher (meilleure UX)
      setTimeout(() => setShowPrompt(true), 2000);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (!showPrompt || !isIOS || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe animate-slide-up">
      <div className="relative max-w-md mx-auto bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl shadow-2xl p-4 text-white">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 pr-8">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <img 
              src="/chef-icon.png" 
              alt="Yumiso" 
              className="w-10 h-10"
            />
          </div>

          {/* Text */}
          <div className="flex-1 space-y-2">
            <h3 className="font-bold text-lg">
              Installez Yumiso
            </h3>
            <p className="text-sm text-white/90 leading-relaxed">
              Ajoutez Yumiso à votre écran d&apos;accueil pour un accès rapide et une expérience optimale.
            </p>

            {/* Instructions */}
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs font-medium mb-2 flex items-center gap-2">
                <span>Comment installer :</span>
              </p>
              <ol className="text-xs space-y-1.5 text-white/90">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">
                    1
                  </span>
                  <span className="flex-1">
                    Appuyez sur le bouton <Share className="inline h-3 w-3 mx-1" /> <strong>Partager</strong> en bas de Safari
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">
                    2
                  </span>
                  <span className="flex-1">
                    Sélectionnez <Plus className="inline h-3 w-3 mx-1" /> <strong>Sur l&apos;écran d&apos;accueil</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">
                    3
                  </span>
                  <span className="flex-1">
                    Appuyez sur <strong>Ajouter</strong>
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
