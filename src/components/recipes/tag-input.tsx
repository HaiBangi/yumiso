"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Tag as TagIcon, Plus } from "lucide-react";
import { getAllTags, searchTags, createTag } from "@/actions/tags";
import type { Tag } from "@/types/recipe";

interface TagInputProps {
  value: number[]; // Tag IDs
  onChange: (tagIds: number[]) => void;
  placeholder?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function TagInput({ value, onChange, placeholder = "Ajouter un tag..." }: TagInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all tags on mount
  useEffect(() => {
    getAllTags().then(tags => setAllTags(tags));
  }, []);

  // Update selected tags when value changes
  useEffect(() => {
    if (allTags.length > 0 && value.length > 0) {
      const selected = allTags.filter(tag => value.includes(tag.id));
      setSelectedTags(selected);
    } else {
      setSelectedTags([]);
    }
  }, [value, allTags]);

  // Search suggestions when input changes
  useEffect(() => {
    if (input.length > 0) {
      searchTags(input).then(results => {
        const filtered = results.filter(tag => !value.includes(tag.id));
        setSuggestions(filtered.slice(0, 8));
        setShowSuggestions(true);
        setSelectedIndex(-1);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [input, value]);

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

  const addTag = (tag: Tag) => {
    if (!value.includes(tag.id)) {
      onChange([...value, tag.id]);
      // Ajouter à la liste locale seulement si le tag n'existe pas déjà
      setAllTags(prev => {
        const exists = prev.some(t => t.id === tag.id);
        return exists ? prev : [...prev, tag];
      });
    }
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const createNewTag = async () => {
    if (!input.trim() || isCreating) return;

    const tagName = input.trim().charAt(0).toUpperCase() + input.trim().slice(1).toLowerCase();
    const tagSlug = slugify(input.trim());

    // Vérifier si le tag existe déjà
    const existing = allTags.find(t => t.slug === tagSlug);
    if (existing) {
      addTag(existing);
      return;
    }

    setIsCreating(true);
    try {
      const newTag = await createTag({
        name: tagName,
        slug: tagSlug,
      });
      addTag(newTag);
    } catch (error) {
      console.error('Erreur création tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const removeTag = (tagId: number) => {
    onChange(value.filter(id => id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex]);
      } else if (input.trim()) {
        // Créer un nouveau tag si aucune suggestion sélectionnée
        createNewTag();
      }
    } else if (e.key === "Backspace" && !input && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1].id);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Vérifier si l'input correspond à un tag existant
  const exactMatch = suggestions.find(s => s.name.toLowerCase() === input.trim().toLowerCase());
  const showCreateOption = input.trim() && !exactMatch && showSuggestions;

  return (
    <div ref={containerRef} className="relative">
      {/* Tags display */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="bg-stone-50 text-stone-600 hover:bg-stone-100 gap-1 pr-1 cursor-default dark:bg-stone-700 dark:text-stone-300"
          >
            <TagIcon className="h-3 w-3" />
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="ml-0.5 hover:opacity-70 rounded-full p-0.5 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={isCreating}
          className="pl-9 bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || showCreateOption) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((tag, index) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? "bg-stone-100 dark:bg-stone-700"
                  : "hover:bg-stone-50 dark:hover:bg-stone-700/50 dark:text-stone-200"
              }`}
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span>{tag.name}</span>
              {index === selectedIndex && (
                <span className="ml-auto text-xs text-stone-400">Entrée</span>
              )}
            </button>
          ))}

          {/* Option pour créer un nouveau tag */}
          {showCreateOption && (
            <button
              type="button"
              onClick={createNewTag}
              disabled={isCreating}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 cursor-pointer transition-colors border-t border-stone-200 dark:border-stone-700 ${
                selectedIndex === suggestions.length
                  ? "bg-emerald-100 dark:bg-emerald-900/40"
                  : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300">
                {isCreating ? "Création..." : `Créer "${input.trim()}"`}
              </span>
              {selectedIndex === suggestions.length && (
                <span className="ml-auto text-xs text-stone-400">Entrée</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-1.5">
        Tapez pour rechercher ou créer un tag. {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} sélectionné{selectedTags.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
