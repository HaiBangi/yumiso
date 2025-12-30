"use client";

import Link from "next/link";
import { ChefHat, ChevronRight, Utensils, Coffee, Cake, Cookie, Apple, Soup, IceCream, Salad } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { HeaderActions } from "@/components/recipes/header-actions";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

async function fetchRecipeName(idOrSlug: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/recipes/${idOrSlug}`);
    if (response.ok) {
      const data = await response.json();
      return data.name;
    }
  } catch {
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
  } catch {
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

    // Gestion des IDs numériques (meal planner)
    if (!isNaN(Number(segment))) {
      if (paths[0] === "meal-planner") {
        breadcrumbs.push({ label: planName || "Détails du menu" });
      } else {
        breadcrumbs.push({ label: "Détails" });
      }
      return;
    }

    // Gestion des slugs de recettes (segment après /recipes/ qui n'est pas dans pathMap)
    if (paths[0] === "recipes" && index === 1 && !pathMap[segment]) {
      // Si recipeName est disponible, l'utiliser, sinon afficher un placeholder discret
      breadcrumbs.push({ label: recipeName || "..." });
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
  
  // État pour le header hide/show au scroll
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(80);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  // Mesurer la hauteur du header
  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Gestion du scroll - hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      // Seuil très bas pour réagir immédiatement
      const threshold = 5;
      
      // Si on est tout en haut, toujours afficher le header
      if (currentScrollY < 10) {
        setIsHeaderVisible(true);
      } 
      // Scroll vers le bas (lecture) → cacher le header immédiatement
      else if (scrollDelta > threshold) {
        setIsHeaderVisible(false);
      } 
      // Scroll vers le haut (intention d'agir) → afficher le header
      else if (scrollDelta < -threshold) {
        setIsHeaderVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const paths = pathname.split("/").filter(Boolean);
    const lastSegment = paths[paths.length - 1];

    // Fetch recipe name - fonctionne pour les IDs numériques ET les slugs
    if (paths[0] === "recipes" && paths.length >= 2 && paths[1]) {
      const recipeIdOrSlug = paths[1];
      console.log('[AppHeader] Fetching recipe name for:', recipeIdOrSlug);
      fetchRecipeName(recipeIdOrSlug).then((name) => {
        if (name) {
          console.log('[AppHeader] Recipe name fetched:', name);
          setRecipeName(name);
        } else {
          console.log('[AppHeader] No recipe name found');
          setRecipeName(undefined);
        }
      });
    } else {
      setRecipeName(undefined);
    }

    // Fetch plan name pour meal planner (toujours des IDs numériques)
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

  const foodIcons = [
    // Mobile icons - bien espacées en largeur (0-100%)
    { Icon: Utensils, delay: 0, duration: 20, x: 8, y: 25, rotate: -15, showOnMobile: true },
    { Icon: Coffee, delay: 2, duration: 25, x: 35, y: 15, rotate: 20, showOnMobile: true },
    { Icon: Cookie, delay: 4, duration: 22, x: 65, y: 35, rotate: -10, showOnMobile: true },
    { Icon: Apple, delay: 1, duration: 24, x: 92, y: 20, rotate: 15, showOnMobile: true },
    { Icon: Cake, delay: 3, duration: 21, x: 50, y: 50, rotate: -20, showOnMobile: true },
    
    // Desktop only - remplir les espaces vides
    { Icon: IceCream, delay: 1, duration: 24, x: 20, y: 60, rotate: 15, showOnMobile: false },
    { Icon: Salad, delay: 3, duration: 21, x: 42, y: 75, rotate: -20, showOnMobile: false },
    { Icon: Soup, delay: 4.5, duration: 19, x: 78, y: 65, rotate: 18, showOnMobile: false },
    { Icon: Coffee, delay: 1.5, duration: 27, x: 15, y: 40, rotate: -25, showOnMobile: false },
    { Icon: Utensils, delay: 3.5, duration: 21, x: 58, y: 10, rotate: 12, showOnMobile: false },
    { Icon: Cake, delay: 6, duration: 24, x: 85, y: 45, rotate: -18, showOnMobile: false },
    { Icon: IceCream, delay: 2.8, duration: 20, x: 28, y: 85, rotate: 22, showOnMobile: false },
    { Icon: Cookie, delay: 4.2, duration: 23, x: 72, y: 88, rotate: -14, showOnMobile: false },
    { Icon: Apple, delay: 5.5, duration: 25, x: 5, y: 70, rotate: 16, showOnMobile: false },
    { Icon: Salad, delay: 1.8, duration: 22, x: 95, y: 55, rotate: -22, showOnMobile: false },
  ];

  return (
    <>
      <header 
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 w-full border-b border-emerald-200/50 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-700 to-green-800 dark:from-emerald-900 dark:to-green-900 shadow-2xl overflow-hidden transition-transform duration-300 ease-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {foodIcons.map(({ Icon, delay, duration, x, y, rotate, showOnMobile }, index) => (
            <div
              key={index}
              className={`absolute animate-float opacity-10 dark:opacity-5 ${showOnMobile ? '' : 'hidden sm:block'}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                transform: `rotate(${rotate}deg)`,
              }}
            >
              <Icon className="h-6 w-6 sm:h-10 sm:w-10 text-white" />
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-screen-2xl relative">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-8">
            <Link href="/recipes" className="flex items-center gap-3 sm:gap-4 group relative">
              <div className="relative p-2.5 sm:p-3.5 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-sm group-hover:bg-white/30 dark:group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ transform: 'rotate(-15deg)' }}>
                  <Utensils className="h-3 w-3 text-emerald-200 animate-bounce" />
                </div>
                <div className="absolute -bottom-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" style={{ transform: 'rotate(20deg)' }}>
                  <Cookie className="h-3 w-3 text-emerald-200 animate-bounce" />
                </div>
                <ChefHat className="h-6 w-6 sm:h-7 sm:w-7 md:h-9 md:w-9 text-white drop-shadow-lg" />
              </div>

              <div className="relative">
                <h1 style={{ fontFamily: "'Delius Swash Caps', cursive", fontWeight: 400, letterSpacing: '0.01em' }} className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white drop-shadow-md transition-all duration-300">
                  Yumiso
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm md:text-base text-white/90 dark:text-white/80 hidden sm:block font-medium">
                    Les recettes de Mimi et Sovi
                  </p>
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

            <HeaderActions />
          </div>

          {breadcrumbs.length > 1 && (
            <div className="px-4 pb-2 sm:px-6 sm:pb-3 md:px-8">
              <nav 
                aria-label="Breadcrumb" 
                className="flex items-center gap-1 text-xs sm:text-sm bg-white/10 dark:bg-white/5 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 w-fit"
              >
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center gap-1">
                    {index > 0 && (
                      <ChevronRight className="h-3 w-3 text-white/60 flex-shrink-0" />
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-white/90 hover:text-white transition-colors duration-200 font-medium px-1.5 py-0.5 rounded hover:bg-white/10 whitespace-nowrap"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-white font-semibold px-1.5 py-0.5 rounded bg-white/15 whitespace-nowrap">
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
      {/* Spacer pour compenser le header fixed */}
      <div style={{ height: headerHeight }} />
    </>
  );
}
