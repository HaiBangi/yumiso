"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="md:col-span-3 border border-amber-100 dark:border-amber-900/50 shadow-sm bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm pb-4">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <span className="text-xl sm:text-2xl">👨‍🍳</span>
          Préparation
        </CardTitle>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          Cliquez sur une étape pour la marquer comme terminée
        </p>
      </CardHeader>
      <CardContent className="pb-2">
        <ol className="space-y-4 sm:space-y-6">
          {steps.map((step) => {
            const isCompleted = completedSteps.has(step.id);
            return (
              <li
                key={step.id}
                onClick={() => toggleStep(step.id)}
                className={`flex gap-3 sm:gap-4 cursor-pointer select-none transition-all duration-200 rounded-lg p-2 -m-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 ${
                  isCompleted ? "opacity-50" : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white shadow-md transition-all ${
                    isCompleted
                      ? "bg-green-500 dark:bg-green-600"
                      : "bg-gradient-to-br from-amber-500 to-orange-500"
                  }`}
                >
                  {isCompleted ? "✓" : step.order}
                </span>
                <p
                  className={`text-sm sm:text-base leading-relaxed pt-0.5 sm:pt-1 transition-all ${
                    isCompleted ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"
                  }`}
                >
                  {step.text}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

