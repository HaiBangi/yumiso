"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock, SortAsc, X } from "lucide-react";
import { useCallback, useTransition } from "react";

interface AdvancedFiltersProps {
  currentSort?: string;
  currentMaxTime?: string;
  viewToggle?: React.ReactNode;
}

const sortOptions = [
  { value: "default", label: "Tri par défaut" },
  { value: "newest", label: "Plus récentes" },
  { value: "oldest", label: "Plus anciennes" },
  { value: "rating", label: "Meilleures notes" },
  { value: "time_asc", label: "Temps (croissant)" },
  { value: "time_desc", label: "Temps (décroissant)" },
  { value: "name_asc", label: "Nom (A-Z)" },
  { value: "name_desc", label: "Nom (Z-A)" },
];

const timeOptions = [
  { value: "all", label: "Tous les temps" },
  { value: "15", label: "< 15 min" },
  { value: "30", label: "< 30 min" },
  { value: "60", label: "< 1 heure" },
  { value: "120", label: "< 2 heures" },
];

export function AdvancedFilters({
  currentSort,
  currentMaxTime,
  viewToggle,
}: AdvancedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "default") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      startTransition(() => {
        router.push(`/recipes?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const hasAdvancedFilters = currentSort || currentMaxTime;

  return (
    <div className="hidden md:flex flex-wrap items-center justify-between gap-3 mb-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-amber-100">
      <div className="flex items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <SortAsc className="h-4 w-4 text-stone-500" />
          <Select
            value={currentSort || "default"}
            onValueChange={(value) => updateParams({ sort: value })}
          >
            <SelectTrigger className="w-[180px] h-9 text-sm cursor-pointer">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Max Time */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-stone-500" />
          <Select
            value={currentMaxTime || "all"}
            onValueChange={(value) => updateParams({ maxTime: value })}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm cursor-pointer">
              <SelectValue placeholder="Temps max" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Advanced Filters */}
        {hasAdvancedFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateParams({ sort: null, maxTime: null })}
            className="cursor-pointer"
          >
            <X className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* View Toggle on the right */}
      {viewToggle && (
        <div className="ml-auto">
          {viewToggle}
        </div>
      )}
    </div>
  );
}
