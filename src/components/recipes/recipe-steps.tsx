"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import type { Step } from "@/types/recipe";

interface RecipeStepsProps {
  steps: Step[];
}

export function RecipeSteps({ steps }: RecipeStepsProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (stepId: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  return (
    <Card className="md:col-span-3 border border-emerald-100 dark:border-emerald-900/50 shadow-sm bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm pb-4">
      <CardHeader className="pb-4">
        <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <span className="text-xl sm:text-2xl">👨‍🍳</span>
          Préparation
        </CardTitle>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          Cliquez sur une étape pour la marquer comme terminée
        </p>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isLastStep = index === steps.length - 1;
            
            return (
              <div key={step.id} className="relative">
                {/* Ligne de connexion verticale entre les étapes */}
                {!isLastStep && (
                  <div 
                    className="absolute left-5 sm:left-6 top-12 sm:top-14 w-0.5 h-[calc(100%+1rem)] bg-gradient-to-b from-stone-200 to-stone-100 dark:from-stone-700 dark:to-stone-800"
                  />
                )}
                
                {/* Carte de l'étape */}
                <div
                  onClick={() => toggleStep(step.id)}
                  className={`group relative cursor-pointer select-none transition-all duration-300 ${
                    isCompleted 
                      ? "opacity-70 hover:opacity-80" 
                      : "hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div className={`rounded-xl p-4 sm:p-5 border-2 transition-all duration-300 ${
                    isCompleted
                      ? "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                      : "bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-900 border-stone-200 dark:border-stone-700 hover:border-emerald-300 dark:hover:border-emerald-700"
                  }`}>
                    <div className="flex gap-4">
                      {/* Numéro de l'étape ou checkmark */}
                      <div className="flex-shrink-0">
                        <div
                          className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-bold shadow-lg transition-all duration-300 ${
                            isCompleted
                              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700"
                              : "bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white" />
                          ) : (
                            <span className="text-white">{step.order}</span>
                          )}
                        </div>
                      </div>

                      {/* Texte de l'étape */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm sm:text-base leading-relaxed text-justify transition-all duration-300 ${
                          isCompleted 
                            ? "text-stone-500 dark:text-stone-400" 
                            : "text-stone-700 dark:text-stone-200"
                        }`}>
                          {step.text.split('\n').map((line, lineIndex) => {
                            // Détecter le niveau d'indentation (nombre d'espaces avant le tiret)
                            const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
                            const trimmedLine = line.trim();
                            const isBulletPoint = trimmedLine.startsWith('-');
                            
                            if (!isBulletPoint) {
                              return (
                                <span key={lineIndex} className="block">
                                  {line}
                                  {lineIndex < step.text.split('\n').length - 1 && line.trim() !== '' && <br />}
                                </span>
                              );
                            }

                            // Calculer le niveau d'indentation (0 = niveau principal, 1 = sous-liste, etc.)
                            const indentLevel = Math.floor(leadingSpaces / 2);
                            const marginLeft = indentLevel > 0 ? `${indentLevel * 1.5}rem` : '0';
                            
                            return (
                              <span 
                                key={lineIndex} 
                                className="block my-1"
                                style={{ marginLeft }}
                              >
                                <span className="flex items-start gap-2">
                                  <span className={`mt-1.5 flex-shrink-0 ${
                                    indentLevel > 0 
                                      ? 'h-1 w-1 rounded-full' 
                                      : 'h-1.5 w-1.5 rounded-full'
                                  } ${
                                    isCompleted 
                                      ? indentLevel > 0 
                                        ? "bg-emerald-300 dark:bg-emerald-700" 
                                        : "bg-emerald-400 dark:bg-emerald-600"
                                      : indentLevel > 0
                                        ? "bg-orange-300 dark:bg-orange-600"
                                        : "bg-orange-400 dark:bg-orange-500"
                                  }`} />
                                  <span className="flex-1">{trimmedLine.replace(/^-\s*/, '')}</span>
                                </span>
                              </span>
                            );
                          })}
                        </div>

                        {/* Badge "Terminé" qui apparaît au hover sur les étapes complétées */}
                        {isCompleted && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                            <Check className="h-3 w-3" />
                            <span>Terminé</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message de félicitations si toutes les étapes sont complétées */}
        {steps.length > 0 && completedSteps.size === steps.length && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-2 border-emerald-300 dark:border-emerald-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 dark:bg-emerald-600 shadow-lg">
                <Check className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  🎉 Bravo ! Toutes les étapes sont terminées
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Votre plat est prêt à être dégusté !
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

