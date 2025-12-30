"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  fallbackSrc?: string;
}

const DEFAULT_RECIPE_IMAGE = "/chef-icon.png";
const DEFAULT_SIZES = "(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw";

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  priority = false,
  sizes = DEFAULT_SIZES,
  objectFit = "cover",
  fallbackSrc = DEFAULT_RECIPE_IMAGE,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setImgSrc(fallbackSrc);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (fill) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image
          src={imgSrc || fallbackSrc}
          alt={alt}
          fill
          sizes={sizes}
          className={cn(
            "transition-all duration-300",
            isLoading ? "scale-110 blur-lg" : "scale-100 blur-0",
            objectFit === "cover" && "object-cover",
            objectFit === "contain" && "object-contain"
          )}
          priority={priority}
          onError={handleError}
          onLoad={handleLoad}
        />
      </div>
    );
  }

  return (
    <Image
      src={imgSrc || fallbackSrc}
      alt={alt}
      width={width || 400}
      height={height || 300}
      className={cn(
        "transition-all duration-300",
        isLoading ? "scale-110 blur-lg" : "scale-100 blur-0",
        className
      )}
      sizes={sizes}
      priority={priority}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}
