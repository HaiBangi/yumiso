"use client";

import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  isPremium: boolean;
  featureName?: string;
}

export function PremiumFeatureGate({
  children,
  isPremium,
  featureName = "cette fonctionnalité",
}: PremiumFeatureGateProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return null;
}

interface PremiumButtonProps {
  isPremium: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export function PremiumButton({
  isPremium,
  onClick,
  children,
  className,
  variant = "default",
  size = "default",
  disabled = false,
}: PremiumButtonProps) {
  if (!isPremium) {
    return null;
  }

  return (
    <Button
      onClick={onClick}
      className={className}
      variant={variant}
      size={size}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

interface PremiumBadgeProps {
  className?: string;
}

export function PremiumBadge({ className }: PremiumBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      Premium
    </span>
  );
}

interface PremiumUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export function PremiumUpgradeDialog({
  open,
  onOpenChange,
  featureName = "Cette fonctionnalité",
}: PremiumUpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center text-xl">
            Fonctionnalité Premium
          </DialogTitle>
          <DialogDescription className="text-center">
            {featureName} nécessite un abonnement Premium pour être utilisée.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 border border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Avantages Premium
            </h4>
            <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Génération de recettes par IA
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Optimisation automatique des recettes
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Génération de menus personnalisés
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Optimisation des listes de courses
              </li>
            </ul>
          </div>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Passer à Premium
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
