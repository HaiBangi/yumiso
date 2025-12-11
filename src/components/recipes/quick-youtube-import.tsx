"use client";

import { Button } from "@/components/ui/button";
import { Youtube } from "lucide-react";

interface QuickYouTubeImportProps {
  onRecipeGenerated: (recipe: any) => void;
  onShowChanged?: (show: boolean) => void;
}

export function QuickYouTubeImport({ 
  onRecipeGenerated, 
  onShowChanged
}: QuickYouTubeImportProps) {
  
  const handleClick = () => {
    if (onShowChanged) {
      onShowChanged(true);
    }
  };

  return (
    <Button
      onClick={handleClick}
      size="icon"
      className="bg-white hover:bg-red-50 dark:bg-stone-900 dark:hover:bg-red-950/20 text-red-600 dark:text-red-500 sm:border-0 border-2 border-red-600 dark:border-red-500 h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:gap-2 shadow-md"
    >
      <Youtube className="h-4 w-4 flex-shrink-0" />
      <span className="hidden sm:inline text-sm font-medium">Importer depuis YouTube</span>
    </Button>
  );
}
