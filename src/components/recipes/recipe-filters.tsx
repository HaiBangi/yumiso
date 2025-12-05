"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

const categories = [
  { value: "all", label: "Toutes les catégories" },
  { value: "MAIN_DISH", label: "Plat principal" },
  { value: "STARTER", label: "Entrée" },
  { value: "DESSERT", label: "Dessert" },
  { value: "SIDE_DISH", label: "Accompagnement" },
  { value: "SOUP", label: "Soupe" },
  { value: "SALAD", label: "Salade" },
  { value: "BEVERAGE", label: "Boisson" },
  { value: "SNACK", label: "En-cas" },
];

interface RecipeFiltersProps {
  currentCategory?: string;
  currentSearch?: string;
}

export function RecipeFilters({ currentCategory, currentSearch }: RecipeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch || "");

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/recipes?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("search", search.trim() || null);
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push("/recipes");
    });
  };

  const hasFilters = currentCategory || currentSearch;

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            type="text"
            placeholder="Rechercher une recette..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white dark:bg-stone-900"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          Rechercher
        </Button>
      </form>

      <Select
        value={currentCategory || "all"}
        onValueChange={(value) => updateParams("category", value)}
      >
        <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-stone-900">
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" onClick={clearFilters} className="gap-2">
          <X className="h-4 w-4" />
          Effacer
        </Button>
      )}
    </div>
  );
}

