"use client";

import { useState } from "react";
import Image from "next/image";
import { ChefHat } from "lucide-react";

interface RecipeImageProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  fallbackClassName?: string;
  iconSize?: "sm" | "md" | "lg" | "xl";
}

const iconSizes = {
  sm: "h-10 w-10 sm:h-16 sm:w-16",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
};

export function RecipeImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes,
  className = "object-cover",
  fallbackClassName = "",
  iconSize = "md",
}: RecipeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-green-100 dark:from-stone-800 dark:to-stone-900 ${fallbackClassName}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-white/50 dark:bg-stone-700/50">
            <ChefHat className={`${iconSizes[iconSize]} text-emerald-500 dark:text-emerald-400`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

