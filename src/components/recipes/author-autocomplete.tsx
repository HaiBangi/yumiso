"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { normalizeString } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, User, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Author {
  id: string;
  name: string;
  count: number;
}

interface AuthorAutocompleteProps {
  availableAuthors: Author[];
  selectedAuthors: string[];
  onAuthorsChange: (authors: string[]) => void;
}

export function AuthorAutocomplete({
  availableAuthors,
  selectedAuthors,
  onAuthorsChange,
}: AuthorAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter authors based on search term (insensitive to case and accents)
  const filteredAuthors = useMemo(() => {
    return searchTerm.trim()
      ? availableAuthors.filter((author) => {
          const normalizedAuthor = normalizeString(author.name);
          const normalizedSearch = normalizeString(searchTerm);
          return normalizedAuthor.includes(normalizedSearch) && !selectedAuthors.includes(author.id);
        })
      : availableAuthors.filter((author) => !selectedAuthors.includes(author.id));
  }, [searchTerm, availableAuthors, selectedAuthors]);

  const handleSelectAuthor = (authorId: string) => {
    if (!selectedAuthors.includes(authorId)) {
      onAuthorsChange([...selectedAuthors, authorId]);
    }
    setSearchTerm("");
    setShowSuggestions(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveAuthor = (authorId: string) => {
    onAuthorsChange(selectedAuthors.filter((id) => id !== authorId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredAuthors.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filteredAuthors.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      handleSelectAuthor(filteredAuthors[focusedIndex].id);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get author name from ID
  const getAuthorName = (authorId: string) => {
    const author = availableAuthors.find((a) => a.id === authorId);
    return author?.name || authorId;
  };

  return (
    <div className="space-y-2">
      {/* Selected authors badges */}
      {selectedAuthors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedAuthors.map((authorId) => (
            <Badge
              key={authorId}
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 pl-2 pr-1 py-1 gap-1"
            >
              <User className="h-3 w-3" />
              <span className="text-xs">{getAuthorName(authorId)}</span>
              <button
                type="button"
                onClick={() => handleRemoveAuthor(authorId)}
                className="ml-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un auteur..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
              setFocusedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="pl-8 pr-3 h-9 text-[13px] placeholder:text-[13px]"
          />
        </div>

        {/* Autocomplete suggestions */}
        {showSuggestions && filteredAuthors.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg overflow-hidden"
          >
            <ScrollArea className="max-h-64">
              <div className="p-1">
                {filteredAuthors.slice(0, 10).map((author, index) => (
                  <button
                    key={`${author.id}-${index}`}
                    type="button"
                    onClick={() => handleSelectAuthor(author.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between gap-2 ${
                      index === focusedIndex
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                        : "hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    <span className="flex items-center gap-2 flex-1 min-w-0">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{author.name}</span>
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400 flex-shrink-0">
                      {author.count} recette{author.count > 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* No results message */}
        {showSuggestions && searchTerm && filteredAuthors.length === 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg p-3"
          >
            <p className="text-sm text-stone-500 dark:text-stone-400 text-center">
              Aucun auteur trouvé
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
