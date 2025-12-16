"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSortPreference } from "@/hooks/use-sort-preference";
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

const sortOptions = [
  { value: "random", label: "Au hasard", icon: "🎲" },
  { value: "recent", label: "Plus récentes", icon: "🆕" },
  { value: "rating", label: "Mieux notées", icon: "⭐" },
  { value: "quick", label: "Plus rapides", icon: "⚡" },
  { value: "favorites", label: "Plus likées", icon: "❤️" },
];

interface MobileFiltersSheetProps {
  currentCategory?: string;
  currentSort?: string;
  currentMaxTime?: string;
  currentTags?: string[];
  availableTags?: Array<{ value: string; label: string; count: number }>;
  currentCollection?: string;
  userCollections?: Array<{ id: number; name: string; count: number; color: string; icon: string }>;
}

export function MobileFiltersSheet({
  currentCategory,
  currentSort,
  currentMaxTime,
  currentTags = [],
  availableTags = [],
  currentCollection,
  userCollections = [],
}: MobileFiltersSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const { getSortPreference, saveSortPreference } = useSortPreference();

  // Initialiser avec la préférence sauvegardée ou currentSort ou "recent" par défaut
  const initialSort = currentSort || getSortPreference() || "recent";

  // Local state for filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentCategory ? currentCategory.split(",") : []
  );
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [maxTime, setMaxTime] = useState(currentMaxTime ? parseInt(currentMaxTime) : 120);
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(currentCollection ? currentCollection.split(",") : []);

  // Sauvegarder la préférence de tri quand elle change
  useEffect(() => {
    saveSortPreference(selectedSort);
  }, [selectedSort, saveSortPreference]);

  // Count active filters
  const activeFiltersCount = [
    selectedCategories.length > 0,
    currentSort && currentSort !== "recent",
    currentMaxTime && parseInt(currentMaxTime) < 120,
    selectedTags.length > 0,
    selectedCollections.length > 0,
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

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(c => c !== collectionId)
        : [...prev, collectionId]
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

    // Collections (multiple)
    if (selectedCollections.length > 0) {
      params.set("collection", selectedCollections.join(","));
    } else {
      params.delete("collection");
    }

    // Reset to page 1 when filters change
    params.delete("page");

    router.push(`/recipes?${params.toString()}`);
    setOpen(false);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedSort("recent");
    setMaxTime(120);
    setSelectedTags([]);
    setSelectedCollections([]);
    router.push("/recipes");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="relative w-full h-12 gap-2 bg-white dark:bg-stone-900 border-2 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all cursor-pointer"
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="font-medium">Filtres & Tri</span>
          {activeFiltersCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-emerald-700 hover:bg-emerald-700 text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-[2rem]">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-600 rounded-full" />
        </div>

        <ScrollArea className="h-[calc(100%-3rem)]">
          <div className="px-6 pb-24">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-emerald-500" />
                Filtres et options
              </SheetTitle>
            </SheetHeader>

            {/* Sort Options */}
            <div className="mb-4">
              <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Trier par
              </Label>
              <RadioGroup value={selectedSort} onValueChange={setSelectedSort} className="space-y-1.5">
                {sortOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`w-full rounded-xl border-2 px-3 py-2 text-left flex items-center gap-2 cursor-pointer transition-all ${
                      selectedSort === option.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm"
                        : "border-stone-200 dark:border-stone-700 hover:border-emerald-300 active:scale-[0.98]"
                    }`}
                    onClick={() => setSelectedSort(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                    <Label
                      htmlFor={`sort-${option.value}`}
                      className="flex-1 cursor-pointer flex items-center gap-2 text-sm font-medium"
                    >
                      <span className="text-lg">{option.icon}</span>
                      {option.label}
                    </Label>
                    {selectedSort === option.value && (
                      <Check className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator className="my-4" />

            {/* Category Filter - Multiple Selection */}
            <div className="mb-4">
              <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
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
                      size="default"
                      onClick={() => toggleCategory(cat.value)}
                      className="h-auto py-2.5 flex-col gap-1 cursor-pointer relative rounded-xl transition-all active:scale-95"
                    >
                      {isSelected && (
                        <Check className="absolute top-1 right-1 h-3.5 w-3.5" />
                      )}
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-[11px] leading-tight">{cat.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Food Tags Filter - Dynamic from DB */}
            <div className="mb-4">
              <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags populaires {selectedTags.length > 0 && `(${selectedTags.length})`}
              </Label>
              {availableTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.value);
                    const emoji = tagEmojiMap[tag.value.toLowerCase()] || "🏷️";
                    return (
                      <Button
                        key={tag.value}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTag(tag.value)}
                        className="h-8 gap-1 cursor-pointer rounded-full transition-all active:scale-95"
                      >
                        <span className="text-sm">{emoji}</span>
                        <span className="text-xs">{tag.label}</span>
                        <span className="text-[10px] opacity-60">({tag.count})</span>
                        {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500 italic">Aucun tag disponible</p>
              )}
            </div>

            <Separator className="my-4" />
            
            {/* Collections Filter - Only if user has collections */}
            {userCollections.length > 0 && (
              <>
                <div className="mb-4">
                  <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    📁 Mes collections {selectedCollections.length > 0 && `(${selectedCollections.length})`}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {userCollections.map((collection) => {
                      const isSelected = selectedCollections.includes(collection.id.toString());
                      return (
                        <Button
                          key={collection.id}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleCollection(collection.id.toString())}
                          className="h-8 gap-1 cursor-pointer rounded-full transition-all active:scale-95"
                          style={isSelected ? { backgroundColor: collection.color, borderColor: collection.color } : {}}
                        >
                          <span className="text-xs">{collection.name}</span>
                          <span className="text-[10px] opacity-60">({collection.count})</span>
                          {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Separator className="my-4" />
              </>
            )}

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
        <SheetFooter className="absolute bottom-0 left-0 right-0 p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex-row gap-2 shadow-lg">
          <Button
            variant="outline"
            size="lg"
            onClick={resetFilters}
            className="flex-1 h-11 cursor-pointer rounded-xl"
          >
            <X className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            size="lg"
            onClick={applyFilters}
            className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 cursor-pointer rounded-xl"
          >
            <Check className="h-4 w-4 mr-2" />
            Appliquer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}