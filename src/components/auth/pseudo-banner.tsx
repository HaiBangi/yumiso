"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUserPseudo } from "@/actions/users";
import { Sparkles, User, ArrowRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PseudoBannerProps {
  userId: string;
  userName?: string | null;
}

export function PseudoBanner({ userId, userName }: PseudoBannerProps) {
  const [pseudo, setPseudo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudo.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await updateUserPseudo(pseudo.trim());
      if (result.success) {
        setIsSuccess(true);
        // Animate out after success
        setTimeout(() => {
          setIsVisible(false);
        }, 1500);
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    });
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "relative overflow-hidden transition-all duration-500",
        isSuccess ? "bg-gradient-to-r from-emerald-700 to-teal-500" : "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600"
      )}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/pattern.svg')]" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative mx-auto max-w-screen-2xl px-4 py-4 sm:py-5">
        {isSuccess ? (
          // Success state
          <div className="flex items-center justify-center gap-3 text-white animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-2 bg-white/20 rounded-full">
              <Check className="h-5 w-5" />
            </div>
            <p className="font-medium">
              Parfait ! Bienvenue <span className="font-bold">{pseudo}</span> ! 🎉
            </p>
          </div>
        ) : (
          // Form state
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Icon and text */}
            <div className="flex items-center gap-3 text-white">
              <div className="hidden sm:flex p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-sm sm:text-base">
                  {userName ? `Bienvenue ${userName} !` : "Bienvenue !"} Choisissez votre pseudo
                </p>
                <p className="text-white/80 text-xs sm:text-sm hidden sm:block">
                  C&apos;est le nom qui apparaîtra sur vos recettes
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  type="text"
                  placeholder="Votre pseudo..."
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  className={cn(
                    "pl-9 h-10 sm:h-11 w-full sm:w-52 bg-white/95 border-0 shadow-lg text-stone-800 placeholder:text-stone-400",
                    error && "ring-2 ring-red-400"
                  )}
                  maxLength={30}
                  disabled={isPending}
                />
              </div>
              <Button
                type="submit"
                disabled={isPending || !pseudo.trim()}
                className="h-10 sm:h-11 px-4 sm:px-6 bg-white text-purple-700 hover:bg-white/90 shadow-lg font-semibold cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <div className="h-4 w-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="hidden sm:inline">Valider</span>
                    <ArrowRight className="h-4 w-4 sm:ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Dismiss button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="absolute right-2 top-2 sm:relative sm:right-auto sm:top-auto text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-center text-white/90 text-sm mt-2 bg-red-500/30 py-1 px-3 rounded-full inline-block mx-auto">
            ⚠️ {error}
          </p>
        )}
      </div>
    </div>
  );
}

