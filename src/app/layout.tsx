import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { SessionProvider } from "@/components/auth/session-provider";
import { RecipeProvider } from "@/components/recipes/recipe-context";
import { AppHeader } from "@/components/layout/app-header";
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

export const metadata: Metadata = {
  title: "Yumiso | Recettes de cuisine",
  description: "Découvrez et gérez vos recettes de cuisine préférées",
  icons: {
    icon: "/chef-icon.png",
    apple: "/chef-icon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${playfair.variable} ${sourceSans.variable} font-sans antialiased bg-stone-50 dark:bg-stone-950`}
      >
        <SessionProvider>
          <RecipeProvider recipe={null}>
            <AppHeader />
            {children}
          </RecipeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
