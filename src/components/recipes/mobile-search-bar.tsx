"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface MobileSearchBarProps {
  currentSearch?: string;
}

export function MobileSearchBar({ currentSearch }: MobileSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch || "");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.push(`/recipes?${params.toString()}`);
    });
  };

  const clearSearch = () => {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    startTransition(() => {
      router.push(`/recipes?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSearchSubmit} className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
        <Input
          type="text"
          placeholder="Rechercher une recette..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-20 h-12 !text-base bg-white dark:bg-stone-900 border-2 focus:border-emerald-400 placeholder:!text-base"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
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
            className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}

