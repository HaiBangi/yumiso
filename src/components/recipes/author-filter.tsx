"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChefHat, Search, User, Users, Check } from "lucide-react";
import { getAuthors, type AuthorInfo } from "@/actions/authors";
import { cn } from "@/lib/utils";

interface AuthorFilterProps {
  currentUserId?: string;
  selectedAuthors?: string[];
}

export function AuthorFilter({ currentUserId, selectedAuthors = [] }: AuthorFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [authors, setAuthors] = useState<AuthorInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Load authors
  useEffect(() => {
    getAuthors().then((data) => {
      setAuthors(data);
      setLoading(false);
    });
  }, []);

  const filteredAuthors = authors.filter(
    (author) =>
      author.name.toLowerCase().includes(search.toLowerCase()) ||
      author.pseudo.toLowerCase().includes(search.toLowerCase())
  );

  const updateAuthorFilter = (authorIds: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (authorIds.length === 0) {
      params.delete("authors");
      params.delete("myRecipes");
    } else if (authorIds.length === 1 && authorIds[0] === "mine") {
      params.delete("authors");
      params.set("myRecipes", "true");
    } else {
      params.delete("myRecipes");
      params.set("authors", authorIds.filter(id => id !== "mine").join(","));
    }

    startTransition(() => {
      router.push(`/recipes?${params.toString()}`);
    });
  };

  const toggleAuthor = (authorId: string) => {
    const current = selectedAuthors.includes(authorId)
      ? selectedAuthors.filter((id) => id !== authorId)
      : [...selectedAuthors, authorId];
    updateAuthorFilter(current);
  };

  const selectAll = () => {
    updateAuthorFilter([]);
    setOpen(false);
  };

  const selectMine = () => {
    if (currentUserId) {
      updateAuthorFilter(["mine"]);
      setOpen(false);
    }
  };

  const isAllSelected = selectedAuthors.length === 0;
  const isMineSelected = selectedAuthors.length === 1 && selectedAuthors[0] === "mine";

  // Determine button label
  let buttonLabel = "Tous les auteurs";
  if (isMineSelected) {
    buttonLabel = "Mes recettes";
  } else if (selectedAuthors.length === 1) {
    const author = authors.find((a) => a.id === selectedAuthors[0] || a.pseudo === selectedAuthors[0]);
    buttonLabel = author?.pseudo || author?.name || "1 auteur";
  } else if (selectedAuthors.length > 1) {
    buttonLabel = `${selectedAuthors.length} auteurs`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-10 sm:h-12 px-3 sm:px-4 gap-2 bg-white dark:bg-stone-900 text-sm sm:text-base cursor-pointer",
            !isAllSelected && "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
          )}
        >
          <Users className="h-4 w-4 text-stone-500" />
          <span className="hidden sm:inline">{buttonLabel}</span>
          <span className="sm:hidden">
            {!isAllSelected && selectedAuthors.length}
          </span>
          {!isAllSelected && (
            <span className="hidden sm:flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs">
              {selectedAuthors.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        {/* Search input */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Rechercher un auteur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-10 !text-base"
            />
          </div>
        </div>

        {/* Quick options */}
        <div className="p-2 border-b space-y-1">
          <button
            onClick={selectAll}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
              isAllSelected
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                : "hover:bg-stone-100 dark:hover:bg-stone-800"
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              isAllSelected ? "bg-amber-500 text-white" : "bg-stone-100 dark:bg-stone-700"
            )}>
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Toutes les recettes</p>
              <p className="text-xs text-stone-500">{authors.reduce((sum, a) => sum + a.recipeCount, 0)} recettes</p>
            </div>
            {isAllSelected && <Check className="h-4 w-4 text-amber-600" />}
          </button>

          {currentUserId && (
            <button
              onClick={selectMine}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                isMineSelected
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                  : "hover:bg-stone-100 dark:hover:bg-stone-800"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                isMineSelected ? "bg-amber-500 text-white" : "bg-stone-100 dark:bg-stone-700"
              )}>
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Mes recettes</p>
                <p className="text-xs text-stone-500">Recettes que j&apos;ai créées</p>
              </div>
              {isMineSelected && <Check className="h-4 w-4 text-amber-600" />}
            </button>
          )}
        </div>

        {/* Authors list */}
        <div className="max-h-60 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-4 text-sm text-stone-500">
              Chargement...
            </div>
          ) : filteredAuthors.length === 0 ? (
            <div className="text-center py-4 text-sm text-stone-500">
              Aucun auteur trouvé
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-stone-400 font-medium px-2 py-1">Filtrer par auteur</p>
              {filteredAuthors.map((author) => {
                const authorKey = author.id || author.pseudo;
                const isSelected = selectedAuthors.includes(authorKey);

                return (
                  <label
                    key={authorKey}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                      isSelected
                        ? "bg-amber-50 dark:bg-amber-900/20"
                        : "hover:bg-stone-100 dark:hover:bg-stone-800"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleAuthor(authorKey)}
                      className="h-4 w-4"
                    />
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-xs font-medium">
                      {author.image ? (
                        <img
                          src={author.image}
                          alt={author.pseudo}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        author.pseudo.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{author.pseudo}</p>
                      <p className="text-xs text-stone-500">
                        {author.recipeCount} recette{author.recipeCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

