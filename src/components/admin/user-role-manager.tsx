"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, ChefHat, User, Loader2, Search, Filter, Calendar, Mail, AtSign } from "lucide-react";
import { updateUserRole } from "@/actions/users";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface UserWithCount {
  id: string;
  name: string | null;
  email: string;
  pseudo: string;
  image: string | null;
  role: string;
  createdAt: Date;
  _count: {
    recipes: number;
    favorites: number;
  };
}

interface UserRoleManagerProps {
  users: UserWithCount[];
  currentUserId: string;
  isOwner: boolean;
}

const roleConfig = {
  OWNER: { 
    label: "Owner", 
    icon: Shield, 
    color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    triggerColor: "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30",
    iconColor: "text-purple-500"
  },
  ADMIN: { 
    label: "Admin", 
    icon: Shield, 
    color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    triggerColor: "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30",
    iconColor: "text-red-500"
  },
  CONTRIBUTOR: { 
    label: "Contributeur", 
    icon: ChefHat, 
    color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    triggerColor: "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30",
    iconColor: "text-amber-500"
  },
  READER: { 
    label: "Lecteur", 
    icon: User, 
    color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    triggerColor: "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30",
    iconColor: "text-blue-500"
  },
};

export function UserRoleManager({ users, currentUserId, isOwner }: UserRoleManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        search === "" ||
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.pseudo.toLowerCase().includes(search.toLowerCase());
      
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setError(null);
    setLoadingUserId(userId);
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole as "ADMIN" | "CONTRIBUTOR" | "READER");
      setLoadingUserId(null);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou pseudo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 !text-base"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px] cursor-pointer">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">Tous les rôles</SelectItem>
              <SelectItem value="OWNER" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  Owner
                </div>
              </SelectItem>
              <SelectItem value="ADMIN" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  Admins
                </div>
              </SelectItem>
              <SelectItem value="CONTRIBUTOR" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-amber-500" />
                  Contributeurs
                </div>
              </SelectItem>
              <SelectItem value="READER" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  Lecteurs
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? "s" : ""} trouvé{filteredUsers.length !== 1 ? "s" : ""}
      </p>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const role = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.READER;
            const RoleIcon = role.icon;
            const isCurrentUser = user.id === currentUserId;
            const isUserOwner = user.role === "OWNER";
            const isUserAdmin = user.role === "ADMIN";
            const isLoading = loadingUserId === user.id && isPending;
            
            // OWNER et les utilisateurs eux-mêmes ne peuvent pas être modifiés
            // Les ADMIN peuvent être modifiés uniquement par le OWNER
            const canChangeRole = !isCurrentUser && !isUserOwner && (isOwner || !isUserAdmin);

            return (
              <div
                key={user.id}
                className={`p-4 rounded-xl border bg-card transition-all ${
                  isCurrentUser ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20" : "hover:border-stone-300 dark:hover:border-stone-600 dark:border-stone-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 border-2 border-white dark:border-stone-700 shadow-sm">
                      <AvatarImage src={user.image || ""} alt={user.name || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-green-500 text-white font-semibold">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate text-stone-900 dark:text-stone-100">
                          {user.name || "Sans nom"}
                        </p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                            Vous
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <AtSign className="h-3 w-3" />
                          {user.pseudo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[180px]">{user.email}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center px-3">
                      <p className="font-bold text-lg text-stone-900 dark:text-stone-100">{user._count.recipes}</p>
                      <p className="text-muted-foreground text-xs">Recettes</p>
                    </div>
                    <div className="text-center px-3 border-l dark:border-stone-700">
                      <p className="font-bold text-lg text-stone-900 dark:text-stone-100">{user._count.favorites}</p>
                      <p className="text-muted-foreground text-xs">Favoris</p>
                    </div>
                    <div className="text-center px-3 border-l dark:border-stone-700 hidden sm:block w-32">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="flex items-center gap-2 sm:w-[180px]">
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
                    {canChangeRole ? (
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className={`w-full cursor-pointer ${role.triggerColor}`}>
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <RoleIcon className={`h-4 w-4 ${role.iconColor}`} />
                              <span className="font-medium">{role.label}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {isOwner && (
                            <SelectItem value="ADMIN" className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40">
                                  <Shield className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-red-700 dark:text-red-300">Admin</span>
                                  <span className="text-xs text-muted-foreground">Gestion complète</span>
                                </div>
                              </div>
                            </SelectItem>
                          )}
                          <SelectItem value="CONTRIBUTOR" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40">
                                <ChefHat className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-amber-700 dark:text-amber-300">Contributeur</span>
                                <span className="text-xs text-muted-foreground">Peut créer</span>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="READER" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40">
                                <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-blue-700 dark:text-blue-300">Lecteur</span>
                                <span className="text-xs text-muted-foreground">Lecture seule</span>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`${role.color} border px-3 py-1.5`}>
                        <RoleIcon className="h-4 w-4 mr-1.5" />
                        {role.label}
                        {(isUserAdmin || isUserOwner) && !isCurrentUser && (
                          <span className="ml-1 text-xs opacity-70">(protégé)</span>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Role Legend */}
      <div className="mt-8 p-5 pb-6 rounded-xl bg-stone-50 dark:bg-stone-800/50 border dark:border-stone-700">
        <h4 className="font-semibold mb-4 text-sm text-stone-900 dark:text-stone-100">Légende des rôles</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 border flex-shrink-0">
              <User className="h-3 w-3 mr-1" />
              Lecteur
            </Badge>
            <p className="text-xs text-muted-foreground leading-tight">Peut consulter les recettes et ajouter des favoris</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 border flex-shrink-0">
              <ChefHat className="h-3 w-3 mr-1" />
              Contributeur
            </Badge>
            <p className="text-xs text-muted-foreground leading-tight">Peut créer et modifier ses propres recettes</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 border flex-shrink-0">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
            <p className="text-xs text-muted-foreground leading-tight">Accès complet, gestion des utilisateurs</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 border flex-shrink-0">
              <Shield className="h-3 w-3 mr-1" />
              Owner
            </Badge>
            <p className="text-xs text-muted-foreground leading-tight">Super admin, peut promouvoir des admins</p>
          </div>
        </div>
      </div>
    </div>
  );
}
