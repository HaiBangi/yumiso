import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { SessionProvider } from "@/components/auth/session-provider";
import { RecipeProvider } from "@/components/recipes/recipe-context";
import { AppHeader } from "@/components/layout/app-header";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://yumiso.fr"),
  title: "Yumiso | Recettes de cuisine",
  description: "Découvrez et gérez vos recettes de cuisine préférées",
  icons: {
    icon: [
      { url: "/chef-icon.png", type: "image/png" },
    ],
    shortcut: "/chef-icon.png",
    apple: "/chef-icon.png",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Delius+Swash+Caps&display=swap');
        </style>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Yumiso" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Yumiso" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#10b981" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />

        {/* Splash Screens for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
      </head>
      <body
        className={`${playfair.variable} ${sourceSans.variable} font-sans antialiased bg-stone-50 dark:bg-stone-950`}
      >
        {/* Skip to main content link for keyboard navigation */}
        <a href="#main-content" className="skip-to-main">
          Aller au contenu principal
        </a>

        <PWAProvider>
          <QueryProvider>
            <SessionProvider>
              <RecipeProvider recipe={null}>
                <Toaster />
                <AppHeader />
                <main id="main-content">
                  {children}
                </main>
              </RecipeProvider>
            </SessionProvider>
          </QueryProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
