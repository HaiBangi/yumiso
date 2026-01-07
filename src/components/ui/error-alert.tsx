"use client";

import { useState } from "react";
import { AlertCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./button";

interface ErrorAlertProps {
  error: string;
  onClose?: () => void;
}

export function ErrorAlert({ error, onClose }: ErrorAlertProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Extraire le message principal et les détails
  const lines = error.split('\n');
  const mainMessage = lines[0] || error;
  const hasDetails = error.length > 150;
  const shortMessage = error.length > 150 ? error.substring(0, 150) + '...' : error;

  return (
    <div className="fixed top-4 right-4 max-w-md animate-in slide-in-from-top-5 fade-in" style={{ zIndex: 'var(--z-toast)' }}>
      <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">
              Erreur
            </h3>

            <div className="text-sm text-red-700 dark:text-red-400 space-y-2">
              {showDetails ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs bg-red-100 dark:bg-red-900/50 p-2 rounded max-h-96 overflow-y-auto">
                  {error}
                </pre>
              ) : (
                <p className="break-words">{shortMessage}</p>
              )}

              {hasDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-7 px-2 text-xs text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Masquer les détails
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Voir tous les détails
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
