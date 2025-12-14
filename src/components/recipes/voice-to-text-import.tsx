/**
 * Composant d'import de recette par voix ou texte
 * Utilise Web Speech API pour la reconnaissance vocale
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2, Sparkles, Type, Wand2 } from "lucide-react";

interface VoiceToTextImportProps {
  onClose: () => void;
  onRecipeGenerated: (recipe: any) => void;
  setIsImporting?: (value: boolean) => void;
  setImportPlatform?: (value: "youtube" | "tiktok" | null) => void;
  setImportStep?: (value: string | null) => void;
}

export function VoiceToTextImport({
  onClose,
  onRecipeGenerated,
  setIsImporting,
  setImportPlatform,
  setImportStep,
}: VoiceToTextImportProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Vérifier si Web Speech API est supportée
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
        setError("Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari.");
      }
    }

    return () => {
      // Cleanup : arrêter la reconnaissance si le composant est démonté
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (!isSupported) return;

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true; // Écoute continue
      recognition.interimResults = true; // Résultats intermédiaires
      recognition.lang = 'fr-FR'; // Langue française

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setText(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Erreur de reconnaissance vocale:', event.error);
        if (event.error === 'no-speech') {
          setError("Aucune parole détectée. Parlez plus fort ou rapprochez-vous du micro.");
        } else if (event.error === 'not-allowed') {
          setError("Permission micro refusée. Autorisez l'accès au micro dans votre navigateur.");
        } else {
          setError(`Erreur: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Erreur lors du démarrage:', err);
      setError("Impossible de démarrer la reconnaissance vocale.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Veuillez entrer ou dicter du texte avant de générer la recette.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Activer l'overlay de chargement
    setIsImporting?.(true);
    setImportPlatform?.(null);
    setImportStep?.("Analyse du texte avec l'IA...");

    try {
      // Générer la recette avec ChatGPT
      const recipeRes = await fetch("/api/youtube/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Recette dictée",
          description: "",
          transcript: text,
          videoUrl: "",
          imageUrl: "",
          author: "Dictée vocale",
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

      setText("");
      onClose();
      setError(null);

      // Désactiver le loading après un court délai
      setTimeout(() => {
        setIsImporting?.(false);
        setImportPlatform?.(null);
        setImportStep?.(null);
      }, 300);
    } catch (err) {
      console.error("Erreur génération:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
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
      {/* Zone de texte avec indicateur d'écoute */}
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Parlez ou tapez votre recette ici... Ex: 'Ma recette s'appelle pâtes carbonara, il faut 200g de pâtes, 100g de lardons, 2 œufs...'"
          className="min-h-[120px] max-h-[300px] text-sm bg-white/90 dark:bg-stone-900 placeholder:text-stone-400 dark:placeholder:text-stone-500 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-600 resize-none overflow-y-auto"
          disabled={isLoading}
        />
        {isListening && (
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            Écoute en cours...
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Bouton Micro / Texte */}
        {isSupported ? (
          <Button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading}
            className={`flex-1 h-10 gap-2 font-medium transition-all ${
              isListening
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4" />
                <span>Arrêter l&apos;écoute</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-stone-700 dark:text-stone-300" />
                <span>Dicter au micro</span>
              </>
            )}
          </Button>
        ) : (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
            <Type className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs text-yellow-700 dark:text-yellow-300">
              Mode texte uniquement (micro non supporté)
            </span>
          </div>
        )}

        {/* Bouton Générer */}
        <Button
          onClick={handleGenerate}
          disabled={!text.trim() || isLoading || isListening}
          className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white h-10 px-6 gap-2 font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Génération...</span>
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              <span>Générer la recette</span>
            </>
          )}
        </Button>
      </div>

      {/* Message d'erreur amélioré */}
      {error && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50/20 backdrop-blur-sm border border-red-400/50">
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-xs font-medium text-red-100 break-words">
                ⚠️ {error}
              </p>
              
              {/* Instructions spécifiques selon le type d'erreur */}
              {(error.includes('service-not-allowed') || error.includes('not-allowed') || error.includes('HTTPS')) && (
                <div className="text-xs text-red-200 space-y-1 pt-2 border-t border-red-400/30">
                  <p className="font-semibold">💡 Comment résoudre :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>En <strong>développement</strong> : Utilisez <code className="bg-red-900/30 px-1 rounded">localhost</code> ou HTTPS</li>
                    <li>En <strong>production</strong> : Le site doit être en HTTPS (✅ automatique sur Vercel)</li>
                    <li>Dans votre <strong>navigateur</strong> : Cliquez sur 🔒 dans la barre d'adresse → Permissions → Autoriser le micro</li>
                    <li><strong>Chrome</strong> : Paramètres → Confidentialité → Autorisations du site → Micro</li>
                  </ul>
                  <p className="pt-2 text-purple-200">
                    ℹ️ En attendant, vous pouvez utiliser le <strong>mode texte</strong> en tapant votre recette.
                  </p>
                </div>
              )}
              
              {error.includes('réseau') && (
                <p className="text-xs text-red-200 pt-2 border-t border-red-400/30">
                  💡 Vérifiez votre connexion internet et réessayez.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compteur de caractères */}
      {text && (
        <div className="text-right">
          <span className="text-xs text-white/60">
            {text.length} caractères
          </span>
        </div>
      )}
    </div>
  );
}
