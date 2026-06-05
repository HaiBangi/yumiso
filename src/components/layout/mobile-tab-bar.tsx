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
      className="md:hidden fixed bottom-0 left-0 right-0 grid grid-cols-4 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border-t border-emerald-100/70 dark:border-emerald-900/40 shadow-[0_-8px_24px_-16px_rgba(28,25,23,0.35)] pb-[env(safe-area-inset-bottom)]"
      style={{ zIndex: "var(--z-fixed)" }}
    >
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 py-2 ${
              active ? "text-emerald-600 dark:text-emerald-400" : "text-stone-500 dark:text-stone-400"
            }`}
          >
            {active && (
              <span className="absolute -top-px h-1 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            )}
            <span
              className={`grid h-[30px] w-[46px] place-items-center rounded-xl transition-colors ${
                active ? "bg-emerald-100 dark:bg-emerald-900/40" : ""
              }`}
            >
              <Icon className="h-[23px] w-[23px]" />
            </span>
            <span className="text-[11px] font-bold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
