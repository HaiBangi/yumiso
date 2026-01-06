"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, ChefHat, Shield, Heart, FolderOpen, Lightbulb, CalendarDays, ShoppingCart, Sparkles } from "lucide-react";
import { usePremium } from "@/hooks/use-premium";

const roleLabels = {
  OWNER: { label: "Propriétaire", icon: Shield, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/40" },
  ADMIN: { label: "Administrateur", icon: Shield, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/40" },
  CONTRIBUTOR: { label: "Contributeur", icon: ChefHat, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/40" },
  READER: { label: "Lecteur", icon: User, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/40" },
};

export function UserButton() {
  const { data: session, status } = useSession();
  const { isPremium } = usePremium();

  if (status === "loading") {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!session?.user) {
    return (
      <Button asChild variant="outline" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 h-9 sm:h-10 md:h-11 px-3 sm:px-4 md:px-5 text-sm sm:text-base cursor-pointer shadow-md">
        <Link href="/auth/signin">
          <User className="mr-2 h-4 w-4" />
          Connexion
        </Link>
      </Button>
    );
  }

  const user = session.user;
  const role = roleLabels[user.role as keyof typeof roleLabels] || roleLabels.READER;
  const RoleIcon = role.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 cursor-pointer hover:ring-2 hover:ring-amber-300 transition-all">
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src={user.image || ""} alt={user.name || "User"} />
            <AvatarFallback className="bg-amber-500 text-white">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-2 dark:bg-stone-800 dark:border-stone-700" align="end" forceMount>
        {/* User Info Header */}
        <DropdownMenuLabel className="font-normal p-3 rounded-lg bg-gradient-to-r from-stone-50 to-stone-100 dark:from-stone-700 dark:to-stone-700/80 mb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white dark:border-stone-600 shadow-sm">
              <AvatarImage src={user.image || ""} alt={user.pseudo || user.name || "User"} />
              <AvatarFallback className="bg-amber-500 text-white font-semibold">
                {(user.pseudo || user.name)?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold leading-none dark:text-stone-100">
                  {user.pseudo || user.name}
                </p>
                {isPremium && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-medium">
                    <Sparkles className="h-2.5 w-2.5" />
                    Pro
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">
                {user.email}
              </p>
              <div className={`flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-full w-fit ${role.color} ${role.bg}`}>
                <RoleIcon className="h-3 w-3" />
                {role.label}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        {/* Navigation Links */}
        <DropdownMenuItem asChild className="py-2.5 px-3 rounded-lg cursor-pointer dark:text-stone-200 dark:hover:bg-stone-700 dark:focus:bg-stone-700">
          <Link href="/profile" className="flex items-center">
            <User className="mr-3 h-4 w-4 text-stone-500 dark:text-stone-400" />
            <span>Mon profil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="py-2.5 px-3 rounded-lg cursor-pointer dark:text-stone-200 dark:hover:bg-stone-700 dark:focus:bg-stone-700">
          <Link href="/profile/recipes" className="flex items-center">
            <ChefHat className="mr-3 h-4 w-4 text-amber-500 dark:text-amber-400" />
            <span>Mes recettes</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="py-2.5 px-3 rounded-lg cursor-pointer dark:text-stone-200 dark:hover:bg-stone-700 dark:focus:bg-stone-700">
          <Link href="/profile/favorites" className="flex items-center">
            <Heart className="mr-3 h-4 w-4 text-pink-500 dark:text-pink-400" />
            <span>Mes favoris</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="py-2.5 px-3 rounded-lg cursor-pointer dark:text-stone-200 dark:hover:bg-stone-700 dark:focus:bg-stone-700">
          <Link href="/profile/collections" className="flex items-center">
            <FolderOpen className="mr-3 h-4 w-4 text-amber-500 dark:text-amber-400" />
            <span>Mes collections</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="py-2.5 px-3 rounded-lg cursor-pointer dark:text-stone-200 dark:hover:bg-stone-700 dark:focus:bg-stone-700">
          <Link href="/notes" className="flex items-center">
            <Lightbulb className="mr-3 h-4 w-4 text-yellow-500 dark:text-yellow-400" />
            <span>Mes notes</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="py-2.5 px-3 rounded-lg cursor-pointer dark:text-stone-200 dark:hover:bg-stone-700 dark:focus:bg-stone-700">
          <Link href="/meal-planner" className="flex items-center">
            <CalendarDays className="mr-3 h-4 w-4 text-green-500 dark:text-green-400" />
            <span>Planificateur de repas</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="py-2.5 px-3 rounded-lg cursor-pointer dark:text-stone-200 dark:hover:bg-stone-700 dark:focus:bg-stone-700">
          <Link href="/shopping-lists" className="flex items-center">
            <ShoppingCart className="mr-3 h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            <span>Listes de courses</span>
          </Link>
        </DropdownMenuItem>

        {/* Admin Section */}
        {(user.role === "ADMIN" || user.role === "OWNER") && (
          <>
            <DropdownMenuSeparator className="my-2 dark:bg-stone-700" />
            <DropdownMenuItem asChild className="py-2.5 px-3 rounded-lg cursor-pointer bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 focus:bg-emerald-100 dark:focus:bg-emerald-900/50">
              <Link href="/admin" className="flex items-center text-emerald-700 dark:text-emerald-400 focus:text-emerald-700 dark:focus:text-emerald-400">
                <Shield className="mr-3 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium">Administration</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {/* Logout */}
        <DropdownMenuSeparator className="my-2 dark:bg-stone-700" />
        <DropdownMenuItem
          className="py-2.5 px-3 rounded-lg cursor-pointer bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 focus:bg-red-100 dark:focus:bg-red-900/50 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-3 h-4 w-4 text-red-500 dark:text-red-400" />
          <span className="font-medium">Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
