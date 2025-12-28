"use client";

import Link from "next/link";
import { ChefHat, ChevronRight, Utensils, Coffee, Cake, Cookie, Apple, Soup, IceCream, Salad } from "lucide-react";
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
    // Silent error
  }
  return null;
}

async function fetchPlanName(id: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/meal-planner/${id}`);
    if (response.ok) {
      const data = await response.json();
      return data.plan?.name;
    }
  } catch (error) {
    // Silent error
  }
  return null;
}

function generateBreadcrumbs(pathname: string, recipeName?: string, planName?: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Accueil", href: "/recipes" }
  ];

  const paths = pathname.replace(/\/$/, "").split("/").filter(Boolean);

  const pathMap: Record<string, string> = {
    recipes: "Recettes",
    profile: "Profil",
    favorites: "Favoris",
    collections: "Collections",
    admin: "Administration",
    auth: "Authentification",
    signin: "Connexion",
    "meal-planner": "Planificateur de repas",
    "shopping-list": "Liste de courses",
    "shopping-lists": "Listes de courses",
    notes: "Notes",
    roadmap: "Roadmap",
  };

  // Cas spécial pour /meal-planner/shopping-list/[planId]
  if (paths[0] === "meal-planner" && paths[1] === "shopping-list" && paths[2]) {
    const planId = paths[2];
    breadcrumbs.push({ label: "Planificateur de repas", href: "/meal-planner" });
    breadcrumbs.push({ label: planName ? `Menu ${planName}` : "Menu", href: `/meal-planner?plan=${planId}` });
    breadcrumbs.push({ label: planName ? `Liste de courses de ${planName}` : "Liste de courses" });
    return breadcrumbs;
  }

  let currentPath = "";

  paths.forEach((segment, index) => {
    currentPath += `/${segment}`;

    if (!isNaN(Number(segment))) {
      // C'est un ID numérique
      if (paths[0] === "recipes") {
        breadcrumbs.push({ label: recipeName || "Détails de la recette" });
      } else if (paths[0] === "meal-planner") {
        breadcrumbs.push({ label: planName || "Détails du menu" });
      } else {
        breadcrumbs.push({ label: "Détails" });
      }
      return;
    }

    const label = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

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
  const [planName, setPlanName] = useState<string | undefined>();

  useEffect(() => {
    const paths = pathname.split("/").filter(Boolean);
    const lastSegment = paths[paths.length - 1];

    // Fetch recipe name
    if (paths[0] === "recipes" && !isNaN(Number(lastSegment))) {
      fetchRecipeName(lastSegment).then((name) => {
        if (name) setRecipeName(name);
      });
    } else {
      setRecipeName(undefined);
    }

    // Fetch plan name for meal-planner/shopping-list/[planId]
    if (paths[0] === "meal-planner" && paths[1] === "shopping-list" && paths[2] && !isNaN(Number(paths[2]))) {
      fetchPlanName(paths[2]).then((name) => {
        if (name) setPlanName(name);
      });
    } else if (paths[0] === "meal-planner" && !isNaN(Number(lastSegment))) {
      fetchPlanName(lastSegment).then((name) => {
        if (name) setPlanName(name);
      });
    } else {
      setPlanName(undefined);
    }
  }, [pathname]);

  if (pathname.startsWith("/auth/")) {
    return null;
  }

  const breadcrumbs = generateBreadcrumbs(pathname, recipeName, planName);

  // Icônes de nourriture flottantes pour l'animation de fond - BEAUCOUP PLUS D'ICÔNES
  const foodIcons = [
    { Icon: Utensils, delay: 0, duration: 20, x: 5, y: 15, rotate: -15 },
    { Icon: Coffee, delay: 2, duration: 25, x: 15, y: 25, rotate: 20 },
    { Icon: Cake, delay: 4, duration: 22, x: 25, y: 75, rotate: -10 },
    { Icon: IceCream, delay: 1, duration: 24, x: 35, y: 45, rotate: 15 },
    { Icon: Salad, delay: 3, duration: 21, x: 45, y: 10, rotate: -20 },
    { Icon: Cookie, delay: 5, duration: 23, x: 55, y: 60, rotate: 25 },
    { Icon: Apple, delay: 2.5, duration: 26, x: 65, y: 30, rotate: -12 },
    { Icon: Soup, delay: 4.5, duration: 19, x: 75, y: 80, rotate: 18 },
    { Icon: Coffee, delay: 1.5, duration: 27, x: 85, y: 50, rotate: -25 },
    { Icon: Utensils, delay: 3.5, duration: 21, x: 12, y: 65, rotate: 12 },
    { Icon: Cake, delay: 6, duration: 24, x: 92, y: 20, rotate: -18 },
    { Icon: IceCream, delay: 2.8, duration: 20, x: 50, y: 85, rotate: 22 },
    { Icon: Cookie, delay: 4.2, duration: 23, x: 8, y: 40, rotate: -14 },
    { Icon: Apple, delay: 5.5, duration: 25, x: 70, y: 70, rotate: 16 },
    { Icon: Salad, delay: 1.8, duration: 22, x: 88, y: 35, rotate: -22 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-200/50 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-700 to-green-800 dark:from-emerald-900 dark:to-green-900 shadow-2xl overflow-hidden">
      {/* Fond animé avec BEAUCOUP d'icônes de nourriture inclinées */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {foodIcons.map(({ Icon, delay, duration, x, y, rotate }, index) => (
          <div
            key={index}
            className="absolute animate-float opacity-10 dark:opacity-5"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${rotate}deg)`,
            }}
          >
            <Icon className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-screen-2xl relative">
        {/* Main Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-8">
          {/* Logo avec glassmorphism */}
          <Link
            href="/recipes"
            className="flex items-center gap-3 sm:gap-4 group relative"
          >
            {/* Conteneur du logo */}
            <div className="relative p-2.5 sm:p-3.5 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-sm group-hover:bg-white/30 dark:group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              {/* Mini icônes inclinées autour du chef */}
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ transform: 'rotate(-15deg)' }}>
                <Utensils className="h-3 w-3 text-emerald-200 animate-bounce" />
              </div>
              <div className="absolute -bottom-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" style={{ transform: 'rotate(20deg)' }}>
                <Cookie className="h-3 w-3 text-emerald-200 animate-bounce" />
              </div>
              
              <ChefHat className="h-6 w-6 sm:h-7 sm:w-7 md:h-9 md:w-9 text-white drop-shadow-lg" />
            </div>

            {/* Texte du logo */}
            <div className="relative">
              <h1 style={{ fontFamily: "'Delius Swash Caps', cursive" }} className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg transition-all duration-300">
                Yumiso
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm md:text-base text-white/90 dark:text-white/80 hidden sm:block font-medium">
                  Les recettes de Mimi et Sovi
                </p>
                {/* Mini icônes inclinées à côté du sous-titre */}
                <div className="hidden md:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div style={{ transform: 'rotate(-12deg)' }}>
                    <IceCream className="h-3.5 w-3.5 text-emerald-200 animate-pulse" />
                  </div>
                  <div style={{ transform: 'rotate(15deg)' }}>
                    <Coffee className="h-3.5 w-3.5 text-emerald-200 animate-pulse delay-100" />
                  </div>
                  <div style={{ transform: 'rotate(-18deg)' }}>
                    <Salad className="h-3.5 w-3.5 text-emerald-200 animate-pulse delay-200" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Actions */}
          <HeaderActions />
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 && (
          <div className="px-4 pb-3 sm:px-6 sm:pb-4 md:px-8">
            <nav 
              aria-label="Breadcrumb" 
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm bg-white/10 dark:bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 w-fit"
            >
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-1 sm:gap-2">
                  {index > 0 && (
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-white/70 dark:text-white/60" />
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-white/95 dark:text-white/90 hover:text-white transition-all duration-300 font-medium hover:scale-105 inline-block px-2 py-1 rounded-md hover:bg-white/10"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-white font-semibold px-2 py-1 rounded-md bg-white/15">
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
