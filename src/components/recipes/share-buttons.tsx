"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Twitter, Facebook, Link2, Check, MessageCircle } from "lucide-react";

interface ShareButtonsProps {
  title: string;
  url?: string;
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  
  // Use current URL if not provided
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const openShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border-white/50 dark:border-stone-700/50 hover:bg-white dark:hover:bg-stone-800 gap-1.5 cursor-pointer shadow-lg"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Partager</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => openShare("twitter")}
          className="cursor-pointer gap-2"
        >
          <Twitter className="h-4 w-4 text-[#1DA1F2]" />
          Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openShare("facebook")}
          className="cursor-pointer gap-2"
        >
          <Facebook className="h-4 w-4 text-[#1877F2]" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openShare("whatsapp")}
          className="cursor-pointer gap-2"
        >
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={copyToClipboard}
          className="cursor-pointer gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Copié !</span>
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Copier le lien
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

