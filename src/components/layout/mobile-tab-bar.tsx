"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChefHat, CalendarDays, ShoppingCart, User } from "lucide-react";

const TABS = [
  { href: "/recipes", label: "Recettes", icon: ChefHat, match: (p: string) => p === "/recipes" || p.startsWith("/recipes/") },
  { href: "/meal-planner", label: "Menus", icon: CalendarDays, match: (p: string) => p.startsWith("/meal-planner") },
  { href: "/shopping-lists", label: "Courses", icon: ShoppingCart, match: (p: string) => p.startsWith("/shopping-list") },
  { href: "/profile", label: "Profil", icon: User, match: (p: string) => p.startsWith("/profile") },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session?.user) return null;
  if (pathname.startsWith("/auth/")) return null;

  return (
    <nav
      aria-label="Navigation principale"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/70 dark:border-stone-800 bg-white/80 dark:bg-stone-950/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      style={{ zIndex: "var(--z-fixed)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 pt-1.5 pb-1">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="group flex flex-col items-center gap-1 py-1.5"
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ${
                  active
                    ? "bg-emerald-100/80 dark:bg-emerald-500/15"
                    : "group-active:bg-stone-100 dark:group-active:bg-stone-800/60"
                }`}
              >
                <Icon
                  strokeWidth={active ? 2.4 : 2}
                  className={`h-[22px] w-[22px] transition-colors duration-300 ${
                    active
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-stone-400 dark:text-stone-500"
                  }`}
                />
              </span>
              <span
                className={`text-[11px] leading-none tracking-wide transition-colors duration-300 ${
                  active
                    ? "font-semibold text-emerald-700 dark:text-emerald-400"
                    : "font-medium text-stone-500 dark:text-stone-400"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
