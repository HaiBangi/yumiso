"use client";

import { Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-1 h-10">
      <Button
        variant={view === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("grid")}
        className={`h-8 cursor-pointer ${
          view === "grid"
            ? "bg-emerald-700 hover:bg-emerald-600 text-white"
            : "hover:bg-stone-100 dark:hover:bg-stone-800"
        }`}
        aria-label="Vue grille"
      >
        <Grid3x3 className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">Grille</span>
      </Button>
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className={`h-8 cursor-pointer ${
          view === "list"
            ? "bg-emerald-700 hover:bg-emerald-600 text-white"
            : "hover:bg-stone-100 dark:hover:bg-stone-800"
        }`}
        aria-label="Vue liste"
      >
        <List className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">Liste</span>
      </Button>
    </div>
  );
}

