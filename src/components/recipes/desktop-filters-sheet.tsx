"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useViewContext } from "@/components/recipes/recipe-list";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  SlidersHorizontal,
  X,
  Check,
  Clock,
  ArrowUpDown,
  Grid3x3,
  List,
  Utensils,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const categories = [
  { value: "MAIN_DISH", label: "Plat principal", emoji: "🍖" },
  { value: "STARTER", label: "Entrée", emoji: "🥗" },
  { value: "DESSERT", label: "Dessert", emoji: "🍰" },
  { value: "SIDE_DISH", label: "Accompagnement", emoji: "🥔" },
  { value: "SOUP", label: "Soupe", emoji: "🍲" },
  { value: "SALAD", label: "Salade", emoji: "🥬" },
  { value: "BEVERAGE", label: "Boisson", emoji: "🍹" },
  { value: "SNACK", label: "En-cas", emoji: "🍿" },
];

const sortOptions = [
  { value: "recent", label: "Plus récentes", icon: "🆕" },
  { value: "rating", label: "Mieux notées", icon: "⭐" },
  { value: "quick", label: "Plus rapides", icon: "⚡" },
  { value: "favorites", label: "Plus likées", icon: "❤️" },
];

// Emoji mapping for common tags
const tagEmojiMap: Record<string, string> = {
  "fastfood": "🍔",
  "fast-food": "🍔",
  "végétarien": "🥗",
  "vegetarian": "🥗",
  "vegan": "🌱",
  "healthy": "💚",
  "comfort": "🤗",
  "asiatique": "🥢",
  "asian": "🥢",
  "italien": "🍝",
  "italian": "🍝",
  "français": "🥖",
  "french": "🥖",
  "mexicain": "🌮",
  "mexican": "🌮",
  "épicé": "🌶️",
  "spicy": "🌶️",
  "sucré": "🍰",
  "sweet": "🍰",
  "salé": "🧂",
  "savory": "🧂",
  "bio": "🌿",
  "organic": "🌿",
  "traditionnel": "👨‍🍳",
  "traditional": "👨‍🍳",
  "moderne": "✨",
  "modern": "✨",
  "rapide": "⚡",
  "quick": "⚡",
  "facile": "👍",
  "easy": "👍",
};

interface DesktopFiltersSheetProps {
  currentCategory?: string;
  currentSort?: string;
  currentMaxTime?: string;
  currentTags?: string[];
  availableTags?: Array<{ value: string; label: string; count: number }>;
}

export function DesktopFiltersSheet({
  currentCategory,
  currentSort,
  currentMaxTime,
  currentTags = [],
  availableTags = [],
}: DesktopFiltersSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const { view, setView } = useViewContext();

  // Local state for filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentCategory ? currentCategory.split(",") : []
  );
  const [selectedSort, setSelectedSort] = useState(currentSort || "recent");
  const [maxTime, setMaxTime] = useState(currentMaxTime ? parseInt(currentMaxTime) : 120);
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);

  // Count active filters
  const activeFiltersCount = [
    selectedCategories.length > 0,
    currentSort && currentSort !== "recent",
    currentMaxTime && parseInt(currentMaxTime) < 120,
    selectedTags.length > 0,
  ].filter(Boolean).length;

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Categories (multiple)
    if (selectedCategories.length > 0) {
      params.set("category", selectedCategories.join(","));
    } else {
      params.delete("category");
    }

    // Sort
    if (selectedSort !== "recent") {
      params.set("sort", selectedSort);
    } else {
      params.delete("sort");
    }

    // Max time
    if (maxTime < 120) {
      params.set("maxTime", maxTime.toString());
    } else {
      params.delete("maxTime");
    }

    // Tags
    if (selectedTags.length > 0) {
      params.set("tags", selectedTags.join(","));
    } else {
      params.delete("tags");
    }

    router.push(`/recipes?${params.toString()}`);
    setOpen(false);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedSort("recent");
    setMaxTime(120);
    setSelectedTags([]);
    router.push("/recipes");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="default"
          className="relative gap-2 h-10 bg-white dark:bg-stone-900 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="font-medium">Filtres & Tri</span>
          {activeFiltersCount > 0 && (
            <Badge
              variant="default"
              className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-emerald-700 hover:bg-emerald-700 text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[400px] sm:w-[480px] p-0">
        <ScrollArea className="h-full">
          <div className="p-6 pb-24">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                <SlidersHorizontal className="h-6 w-6 text-emerald-700" />
                Filtres et options
              </SheetTitle>
            </SheetHeader>

            {/* View Toggle */}
            <div className="mb-6">
              <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" />
                Affichage
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={view === "grid" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setView("grid")}
                  className="h-12 cursor-pointer"
                >
                  <Grid3x3 className="h-4 w-4 mr-2" />
                  Grille
                </Button>
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setView("list")}
                  className="h-12 cursor-pointer"
                >
                  <List className="h-4 w-4 mr-2" />
                  Liste
                </Button>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Sort Options */}
            <div className="mb-6">
              <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Trier par
              </Label>
              <RadioGroup value={selectedSort} onValueChange={setSelectedSort} className="space-y-2">
                {sortOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`flex items-center space-x-3 rounded-lg border-2 p-4 transition-all cursor-pointer ${
                      selectedSort === option.value
                        ? "border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-stone-200 dark:border-stone-700 hover:border-stone-300"
                    }`}
                    onClick={() => setSelectedSort(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                    <Label
                      htmlFor={`sort-${option.value}`}
                      className="flex-1 cursor-pointer flex items-center gap-2 text-base"
                    >
                      <span className="text-xl">{option.icon}</span>
                      {option.label}
                    </Label>
                    {selectedSort === option.value && (
                      <Check className="h-5 w-5 text-emerald-700" />
                    )}
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator className="my-6" />

            {/* Category Filter - Multiple Selection */}
            <div className="mb-6">
              <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Catégories {selectedCategories.length > 0 && `(${selectedCategories.length})`}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.value);
                  return (
                    <Button
                      key={cat.value}
                      variant={isSelected ? "default" : "outline"}
                      size="lg"
                      onClick={() => toggleCategory(cat.value)}
                      className="h-auto py-3 flex-col gap-1 cursor-pointer relative"
                    >
                      {isSelected && (
                        <Check className="absolute top-1 right-1 h-4 w-4" />
                      )}
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="text-xs">{cat.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Food Tags Filter - Dynamic from DB */}
            <div className="mb-6">
              <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags populaires {selectedTags.length > 0 && `(${selectedTags.length})`}
              </Label>
              {availableTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.value);
                    const emoji = tagEmojiMap[tag.value.toLowerCase()] || "🏷️";
                    return (
                      <Button
                        key={tag.value}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTag(tag.value)}
                        className="h-9 gap-1.5 cursor-pointer"
                      >
                        <span>{emoji}</span>
                        <span className="text-xs">{tag.label}</span>
                        <span className="text-[10px] opacity-60">({tag.count})</span>
                        {isSelected && <Check className="h-3 w-3 ml-1" />}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500 italic">Aucun tag disponible</p>
              )}
            </div>

            <Separator className="my-6" />

            {/* Time Filter */}
            <div className="mb-6">
              <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Temps maximum
              </Label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600 dark:text-stone-400">
                    Jusqu&apos;à {maxTime === 120 ? "2h+" : `${maxTime} min`}
                  </span>
                  {maxTime < 120 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMaxTime(120)}
                      className="h-7 text-xs cursor-pointer"
                    >
                      Réinitialiser
                    </Button>
                  )}
                </div>
                <Slider
                  value={[maxTime]}
                  onValueChange={(value) => setMaxTime(value[0])}
                  min={15}
                  max={120}
                  step={15}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-stone-500">
                  <span>15 min</span>
                  <span>30 min</span>
                  <span>1h</span>
                  <span>2h+</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex-row gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={resetFilters}
            className="flex-1 h-12 cursor-pointer"
          >
            <X className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            size="lg"
            onClick={applyFilters}
            className="flex-1 h-12 bg-emerald-700 hover:bg-emerald-600 cursor-pointer"
          >
            <Check className="h-4 w-4 mr-2" />
            Appliquer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

