import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "assets.afcdn.com" },
      { protocol: "https", hostname: "d1e3z2jco40k3v.cloudfront.net" },
      { protocol: "https", hostname: "www.jessicagavin.com" },
      { protocol: "https", hostname: "whodoesthedishes.com" },
      { protocol: "https", hostname: "www.papillesetpupilles.fr" },
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "img.huffingtonpost.com" },
      { protocol: "https", hostname: "www.lidl-recettes.fr" },
      { protocol: "https", hostname: "i-reg.unimedias.fr" },
      { protocol: "https", hostname: "cookeez.fr" },
      { protocol: "https", hostname: "cdn.pratico-pratiques.com" },
      { protocol: "https", hostname: "i1.wp.com" },
      { protocol: "https", hostname: "www.auxdelicesdupalais.net" },
    ],
  },
};

export default nextConfig;
