"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface DesktopSearchBarProps {
  currentSearch?: string;
}

export function DesktopSearchBar({ currentSearch }: DesktopSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get("search") as string;
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    router.push(`/recipes?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <Input
          name="search"
          type="text"
          placeholder="Rechercher une recette..."
          defaultValue={currentSearch}
          className="pl-10 h-10 !text-base bg-white dark:bg-stone-900 focus:border-emerald-400 placeholder:!text-base"
        />
      </div>
      <Button type="submit" size="default" className="h-10 px-4 cursor-pointer bg-emerald-700 hover:bg-emerald-600">
        Rechercher
      </Button>
    </form>
  );
}

