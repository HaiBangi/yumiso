"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/actions/favorites";

interface FavoriteButtonProps {
  recipeId: number;
  isFavorited?: boolean;
  variant?: "default" | "card" | "compact";
  className?: string;
}

export function FavoriteButton({
  recipeId,
  isFavorited = false,
  variant = "default",
  className,
}: FavoriteButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorited, setOptimisticFavorited] = useState(isFavorited);

  const handleToggle = () => {
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    setOptimisticFavorited(!optimisticFavorited);
    
    startTransition(async () => {
      const result = await toggleFavorite(recipeId);
      if (!result.success) {
        // Revert on error
        setOptimisticFavorited(optimisticFavorited);
      }
    });
  };

  if (variant === "compact") {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
        disabled={isPending}
        className={cn(
          "p-1 rounded-full transition-all",
          optimisticFavorited
            ? "text-red-500"
            : "text-stone-400 hover:text-red-500",
          isPending && "opacity-50",
          className
        )}
      >
        <Heart
          className={cn("h-4 w-4", optimisticFavorited && "fill-current")}
        />
      </button>
    );
  }

  if (variant === "card") {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
        disabled={isPending}
        className={cn(
          "absolute top-2 right-2 p-2 rounded-full transition-all",
          optimisticFavorited
            ? "bg-red-500 text-white"
            : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-500",
          isPending && "opacity-50",
          className
        )}
      >
        <Heart
          className={cn("h-4 w-4", optimisticFavorited && "fill-current")}
        />
      </button>
    );
  }

  return (
    <Button
      variant={optimisticFavorited ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        optimisticFavorited && "bg-red-500 hover:bg-red-600 border-red-500",
        className
      )}
    >
      <Heart
        className={cn(
          "mr-2 h-4 w-4",
          optimisticFavorited && "fill-current"
        )}
      />
      {optimisticFavorited ? "Favori" : "Ajouter aux favoris"}
    </Button>
  );
}

