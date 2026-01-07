"use client";

import { useState, useEffect } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { Button } from "./button";

interface SuccessAlertProps {
  message: string;
  details?: string;
  onClose?: () => void;
  autoClose?: number; // Auto-close after X milliseconds
}

export function SuccessAlert({ message, details, onClose, autoClose = 5000 }: SuccessAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose && autoClose > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          setTimeout(onClose, 300); // Wait for animation
        }
      }, autoClose);

      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(onClose, 300);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 max-w-md animate-in slide-in-from-top-5 fade-in" style={{ zIndex: 'var(--z-toast)' }}>
      <div className="bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                Succès !
              </h3>
            </div>

            <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-2">
              {message}
            </p>

            {details && (
              <div className="mt-2 p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded text-xs text-emerald-700 dark:text-emerald-400">
                {details}
              </div>
            )}
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/50 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
