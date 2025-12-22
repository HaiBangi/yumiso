"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { getCategoryLabel } from "@/lib/category-labels";
import { formatTime } from "@/lib/utils";

interface MobileSearchBarProps {
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

export function MobileSearchBar({ currentSearch }: MobileSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch || "");
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (search.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/recipes/autocomplete?q=${encodeURIComponent(search)}`);
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [search]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(search);
  };

  const performSearch = (searchTerm: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.push(`/recipes?${params.toString()}`);
    });
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (recipeName: string) => {
    setSearch(recipeName);
    performSearch(recipeName);
  };

  const clearSearch = () => {
    setSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");
    startTransition(() => {
      router.push(`/recipes?${params.toString()}`);
    });
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
    <form onSubmit={handleSearchSubmit} className="w-full">
      <div className="relative" ref={wrapperRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 z-10" />
        <Input
          type="text"
          placeholder="Rechercher une recette..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-20 h-12 !text-base bg-white dark:bg-stone-900 border-2 focus:border-emerald-400 placeholder:!text-base"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 z-10">
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-8 w-8 p-0 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="h-8 px-3 bg-emerald-700 hover:bg-emerald-600 cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-1">
                        {suggestion.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-stone-500 dark:text-stone-400">
                        <span className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px]">
                          {getCategoryLabel(suggestion.category)}
                        </span>
                        <span className="truncate text-[10px]">{suggestion.author}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-stone-500 dark:text-stone-400 shrink-0">
                      {suggestion.rating > 0 && (
                        <div className="flex items-center gap-0.5">
                          <span className="text-yellow-500">★</span>
                          <span className="font-medium">{suggestion.rating.toFixed(1)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-0.5">
                        <span>⏱️</span>
                        <span>{formatTime(totalTime)}</span>
                      </div>
                      {suggestion.caloriesPerServing && (
                        <div className="flex items-center gap-0.5">
                          <span>🔥</span>
                          <span>{suggestion.caloriesPerServing}</span>
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
    </form>
  );
}