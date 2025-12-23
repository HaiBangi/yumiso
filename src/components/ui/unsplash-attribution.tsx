"use client";

import { ExternalLink } from "lucide-react";

interface UnsplashAttributionProps {
  photographerName: string;
  photographerUsername: string;
  photographerUrl: string;
  className?: string;
}

/**
 * Composant d'attribution Unsplash conforme aux guidelines
 * Doit être affiché avec chaque image Unsplash
 */
export function UnsplashAttribution({
  photographerName,
  photographerUsername,
  photographerUrl,
  className = "",
}: UnsplashAttributionProps) {
  const unsplashUrl = `https://unsplash.com?utm_source=yumiso&utm_medium=referral`;

  return (
    <div
      className={`flex items-center gap-1 text-[10px] sm:text-xs text-white/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded ${className}`}
    >
      <span>Photo by</span>
      <a
        href={photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-white font-medium inline-flex items-center gap-0.5"
      >
        {photographerName}
        <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      </a>
      <span>on</span>
      <a
        href={unsplashUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-white font-medium inline-flex items-center gap-0.5"
      >
        Unsplash
        <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      </a>
    </div>
  );
}
