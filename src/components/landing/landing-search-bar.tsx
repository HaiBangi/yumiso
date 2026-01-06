"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, Clock, ChefHat } from "lucide-react";
import { getCategoryLabel } from "@/lib/category-labels";
import { formatTime } from "@/lib/utils";
import { useRecipeAutocomplete } from "@/hooks/use-recipe-query";
import { useDebounce } from "@/hooks/use-debounce";

interface RecipeSuggestion {
  id: number;
  name: string;
  slug: string;
  category: string;
  author: string;
  rating: number;
  preparationTime: number;
  cookingTime: number;
  caloriesPerServing: number | null;
}

export function LandingSearchBar() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchValue, 300);
  const { data: suggestions = [] } = useRecipeAutocomplete(debouncedSearch);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/recipes?search=${encodeURIComponent(searchValue.trim())}`);
    } else {
      router.push("/recipes");
    }
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: RecipeSuggestion) => {
    router.push(`/recipes/${suggestion.slug || suggestion.id}`);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 h-6 w-6 sm:h-7 sm:w-7 text-stone-500" />
          <Input
            type="text"
            placeholder="Rechercher une recette... ex: Loc Lac"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="pl-14 sm:pl-16 pr-6 h-16 sm:h-20 text-lg sm:text-xl rounded-full border-2 border-stone-200 bg-white/90 backdrop-blur-sm shadow-xl shadow-emerald-200/30 hover:shadow-2xl hover:shadow-emerald-300/40 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200 placeholder:text-stone-500 placeholder:text-lg sm:placeholder:text-xl transition-all duration-300"
          />
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50 animate-fade-in">
          <div className="max-h-80 overflow-y-auto">
            {suggestions.map((suggestion: RecipeSuggestion, index: number) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                  index === selectedIndex
                    ? "bg-emerald-50"
                    : "hover:bg-stone-50"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <ChefHat className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 truncate">{suggestion.name}</p>
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <span>{getCategoryLabel(suggestion.category)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(suggestion.preparationTime + suggestion.cookingTime)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
