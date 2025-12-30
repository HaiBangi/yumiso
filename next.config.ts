import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  images: {
    // DÉSACTIVER l'optimisation d'images Vercel pour économiser le quota
    // Les images Unsplash/YouTube sont déjà optimisées côté source
    unoptimized: true,
    // Garder les patterns pour la validation des URLs
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "static01.nyt.com",
      },
      {
        protocol: "https",
        hostname: "*.nyt.com",
      },
    ],
    // Cache TTL à 31 jours
    minimumCacheTTL: 2678400,
  },
  // Config Turbopack vide pour éviter l'erreur en dev
  turbopack: {},
  // Optimisations de compilation
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
};

export default withPWA(nextConfig);
