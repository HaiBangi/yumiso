/**
 * Composant d'import de recette par voix ou texte
 * Utilise Web Speech API pour la reconnaissance vocale
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2, Wand2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Vérifier si Web Speech API est supportée
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
        toast.error("Micro non supporté", {
          description: "Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari.",
          icon: <AlertCircle className="h-5 w-5" />,
          duration: 6000,
        });
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
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }

        if (finalTranscript) {
          setText(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Erreur de reconnaissance vocale:', event.error);
        if (event.error === 'no-speech') {
          toast.error("Aucune parole détectée", {
            description: "Parlez plus fort ou rapprochez-vous du micro.",
            icon: <Mic className="h-5 w-5" />,
            duration: 5000,
          });
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error("Permission micro refusée", {
            description: "Autorisez l'accès au micro dans les paramètres de votre navigateur.",
            icon: <MicOff className="h-5 w-5" />,
            duration: 6000,
          });
        } else {
          toast.error("Erreur micro", {
            description: event.error,
            icon: <AlertCircle className="h-5 w-5" />,
            duration: 5000,
          });
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
      toast.error("Erreur micro", {
        description: "Impossible de démarrer la reconnaissance vocale.",
        icon: <AlertCircle className="h-5 w-5" />,
        duration: 5000,
      });
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
      toast.error("Texte manquant", {
        description: "Veuillez entrer ou dicter du texte avant de générer la recette.",
        icon: <AlertCircle className="h-5 w-5" />,
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);

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

      // Désactiver le loading après un court délai
      setTimeout(() => {
        setIsImporting?.(false);
        setImportPlatform?.(null);
        setImportStep?.(null);
      }, 300);
    } catch (err) {
      console.error("Erreur génération:", err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error("Erreur de génération", {
        description: errorMessage,
        icon: <AlertCircle className="h-5 w-5" />,
        duration: 5000,
      });
      // Désactiver le loading en cas d'erreur
      setIsImporting?.(false);
      setImportPlatform?.(null);
      setImportStep?.(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t border-white/20 space-y-3">
      {/* Zone de texte avec indicateur d'écoute */}
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tapez ou dictez votre recette... Ex: 'Pâtes carbonara : 200g pâtes, 100g lardons, 2 œufs...'"
          className="h-[150px] text-sm bg-white/90 dark:bg-stone-900 placeholder:text-stone-400 dark:placeholder:text-stone-500 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-600 resize-none overflow-y-auto"
          disabled={isLoading}
        />
        {isListening && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
            Écoute...
          </div>
        )}
        {/* Compteur de caractères */}
        {text && (
          <div className="absolute bottom-1 right-2">
            <span className="text-[10px] text-stone-400 dark:text-stone-500">
              {text.length} car.
            </span>
          </div>
        )}
      </div>

      {/* Boutons d'action : Générer à gauche, Micro à droite */}
      <div className="flex gap-2">
        {/* Bouton Générer */}
        <Button
          onClick={handleGenerate}
          disabled={!text.trim() || isLoading || isListening}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white h-10 px-4 gap-2 font-medium"
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

        {/* Bouton Micro */}
        {isSupported && (
          <Button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading}
            className={`h-10 px-4 gap-2 font-medium transition-all ${
              isListening
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-white dark:border-stone-600"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                <span>Micro</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
