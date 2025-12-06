"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useTransition } from "react";

const quickCategories = [
  { value: "MAIN_DISH", label: "🍽️ Plats", color: "bg-amber-500 hover:bg-amber-600" },
  { value: "STARTER", label: "🥗 Entrées", color: "bg-emerald-700 hover:bg-emerald-600" },
  { value: "DESSERT", label: "🍰 Desserts", color: "bg-pink-500 hover:bg-pink-600" },
  { value: "SNACK", label: "🍿 En-cas", color: "bg-violet-500 hover:bg-violet-600" },
];

interface QuickFiltersProps {
  currentCategory?: string;
}

export function QuickFilters({ currentCategory }: QuickFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleClick = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (currentCategory === category) {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    
    startTransition(() => {
      router.push(`/recipes?${params.toString()}`);
    });
  };

  return (
    // Hidden on mobile, visible on md and up
    <div className={`hidden md:flex flex-wrap gap-3 mb-6 ${isPending ? "opacity-50" : ""}`}>
      {quickCategories.map((cat) => {
        const isActive = currentCategory === cat.value;
        return (
          <Badge
            key={cat.value}
            onClick={() => handleClick(cat.value)}
            className={`
              cursor-pointer text-base px-4 py-2 transition-all
              ${isActive 
                ? `${cat.color} text-white ring-2 ring-offset-2 ring-stone-400` 
                : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
              }
            `}
          >
            {cat.label}
          </Badge>
        );
      })}
      
      {currentCategory && (
        <Badge
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("category");
            startTransition(() => {
              router.push(`/recipes?${params.toString()}`);
            });
          }}
          className="cursor-pointer text-base px-4 py-2 bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-300"
        >
          ✕ Tout afficher
        </Badge>
      )}
    </div>
  );
}
