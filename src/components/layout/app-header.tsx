"use client";

import Link from "next/link";
import { ChefHat, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HeaderActions } from "@/components/recipes/header-actions";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

async function fetchRecipeName(id: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/recipes/${id}`);
    if (response.ok) {
      const data = await response.json();
      return data.name;
    }
  } catch (error) {
    console.error("Error fetching recipe name:", error);
  }
  return null;
}

function generateBreadcrumbs(pathname: string, recipeName?: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Accueil", href: "/recipes" }
  ];

  // Remove trailing slash and split path
  const paths = pathname.replace(/\/$/, "").split("/").filter(Boolean);

  // Map paths to breadcrumb labels
  const pathMap: Record<string, string> = {
    recipes: "Recettes",
    profile: "Profil",
    favorites: "Favoris",
    admin: "Administration",
    auth: "Authentification",
    signin: "Connexion",
  };

  let currentPath = "";

  paths.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // If it's a number (recipe ID), use the recipe name if available
    if (!isNaN(Number(segment))) {
      breadcrumbs.push({ label: recipeName || "Détails de la recette" });
      return;
    }

    const label = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    // Last item should not have href
    if (index === paths.length - 1) {
      breadcrumbs.push({ label });
    } else {
      breadcrumbs.push({ label, href: currentPath });
    }
  });

  return breadcrumbs;
}

export function AppHeader() {
  const pathname = usePathname();
  const [recipeName, setRecipeName] = useState<string | undefined>();

  // Fetch recipe name if we're on a recipe detail page
  useEffect(() => {
    const paths = pathname.split("/").filter(Boolean);
    const lastSegment = paths[paths.length - 1];

    if (paths[0] === "recipes" && !isNaN(Number(lastSegment))) {
      fetchRecipeName(lastSegment).then((name) => {
        if (name) setRecipeName(name);
      });
    } else {
      setRecipeName(undefined);
    }
  }, [pathname]);

  // Don't show header on auth pages
  if (pathname.startsWith("/auth/")) {
    return null;
  }

  const breadcrumbs = generateBreadcrumbs(pathname, recipeName);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-200/50 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-700 to-green-800 dark:from-emerald-900 dark:to-green-900 shadow-md">
      <div className="mx-auto max-w-screen-2xl">
        {/* Main Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-8">
          {/* Logo */}
          <Link
            href="/recipes"
            className="flex items-center gap-3 sm:gap-4 group transition-transform hover:scale-105"
          >
            <div className="p-2 sm:p-3 rounded-xl bg-white/20 dark:bg-white/10 backdrop-blur-sm group-hover:bg-white/30 dark:group-hover:bg-white/20 transition-colors">
              <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-white">
                Yumiso
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-white/80 dark:text-white/70 hidden sm:block">
                Les recettes de MISO
              </p>
            </div>
          </Link>

          {/* Actions */}
          <HeaderActions />
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 && (
          <div className="px-4 pb-3 sm:px-6 sm:pb-4 md:px-8">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-1 sm:gap-2">
                  {index > 0 && (
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-white/60 dark:text-white/50" />
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-white/80 dark:text-white/70 hover:text-white transition-colors font-medium hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-white font-semibold">
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

