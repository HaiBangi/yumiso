"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { getCategoryLabel } from "@/lib/category-labels";

interface DesktopSearchBarProps {
  currentSearch?: string;
}

interface RecipeSuggestion {
  id: number;
  name: string;
  category: string;
  author: string;
  rating: number;
  preparationTime: number;
  cookingTime: number;
  caloriesPerServing: number | null;
}

export function DesktopSearchBar({ currentSearch }: DesktopSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch || "");
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchValue.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/recipes/autocomplete?q=${encodeURIComponent(searchValue)}`);
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchValue]);

  // Close suggestions when clicking outside
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
    performSearch(searchValue);
  };

  const performSearch = (search: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    // Reset to page 1 on new search
    params.delete("page");
    router.push(`/recipes?${params.toString()}`);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (recipeName: string) => {
    setSearchValue(recipeName);
    performSearch(recipeName);
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
      handleSuggestionClick(suggestions[selectedIndex].name);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
      <div className="relative flex-1" ref={wrapperRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 z-10" />
        <Input
          name="search"
          type="text"
          placeholder="Rechercher une recette..."
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 h-10 !text-base bg-white dark:bg-stone-900 focus:border-emerald-400 placeholder:!text-base"
          autoComplete="off"
        />
        
        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
            {suggestions.map((suggestion, index) => {
              const totalTime = suggestion.preparationTime + suggestion.cookingTime;
              return (
                <div
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion.name)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-4 py-3 cursor-pointer transition-colors border-b border-stone-100 dark:border-stone-800 last:border-0 ${
                    index === selectedIndex
                      ? "bg-emerald-50 dark:bg-emerald-900/20"
                      : "hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {suggestion.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-stone-500 dark:text-stone-400">
                        <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded">
                          {getCategoryLabel(suggestion.category)}
                        </span>
                        <span>{suggestion.author}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                      {suggestion.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="font-medium">{suggestion.rating.toFixed(1)}/10</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span>⏱️</span>
                        <span>{totalTime} min</span>
                      </div>
                      {suggestion.caloriesPerServing && (
                        <div className="flex items-center gap-1">
                          <span>🔥</span>
                          <span>{suggestion.caloriesPerServing} kcal</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Button type="submit" size="default" className="h-10 px-4 cursor-pointer bg-emerald-700 hover:bg-emerald-600">
        Rechercher
      </Button>
    </form>
  );
}