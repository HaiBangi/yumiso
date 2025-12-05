"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Tag, Plus } from "lucide-react";
import { searchTags, getAllTags } from "@/actions/tags";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = "Ajouter un tag..." }: TagInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all tags on mount
  useEffect(() => {
    getAllTags().then(setAllTags);
  }, []);

  // Search suggestions when input changes
  useEffect(() => {
    if (input.length > 0) {
      const queryLower = input.toLowerCase();
      // Filter from local allTags for faster response
      const filtered = allTags
        .filter((tag) => tag.includes(queryLower))
        .filter((tag) => !value.map(v => v.toLowerCase()).includes(tag.toLowerCase()))
        .slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [input, allTags, value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !value.map(v => v.toLowerCase()).includes(normalizedTag)) {
      onChange([...value, normalizedTag]);
    }
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag.toLowerCase() !== tagToRemove.toLowerCase()));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex]);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Tags display */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="bg-amber-100 text-amber-800 hover:bg-amber-200 gap-1 pr-1 cursor-default"
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:bg-amber-300 rounded-full p-0.5 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input.length > 0 && setSuggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-9 placeholder:text-stone-300 placeholder:italic"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? "bg-amber-100 text-amber-900"
                  : "hover:bg-stone-50"
              }`}
            >
              <Tag className="h-3.5 w-3.5 text-amber-500" />
              <span>{suggestion}</span>
              {index === selectedIndex && (
                <span className="ml-auto text-xs text-stone-400">Entrée</span>
              )}
            </button>
          ))}
          {input.trim() && !suggestions.includes(input.toLowerCase()) && (
            <button
              type="button"
              onClick={() => addTag(input)}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 cursor-pointer hover:bg-stone-50 border-t"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-500" />
              <span>Créer &quot;{input.toLowerCase()}&quot;</span>
            </button>
          )}
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-1.5">
        Appuyez sur Entrée pour ajouter. Ex: asiatique, riz, végétarien...
      </p>
    </div>
  );
}

