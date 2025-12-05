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
}

const roleConfig = {
  ADMIN: { label: "Admin", icon: Shield, color: "bg-red-100 text-red-700 border-red-200" },
  CONTRIBUTOR: { label: "Contributeur", icon: ChefHat, color: "bg-amber-100 text-amber-700 border-amber-200" },
  READER: { label: "Lecteur", icon: User, color: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function UserRoleManager({ users, currentUserId }: UserRoleManagerProps) {
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
            className="pl-9"
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
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
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
            const isAdmin = user.role === "ADMIN";
            const isLoading = loadingUserId === user.id && isPending;
            const canChangeRole = !isCurrentUser && !isAdmin;

            return (
              <div
                key={user.id}
                className={`p-4 rounded-xl border bg-card transition-all ${
                  isCurrentUser ? "border-amber-300 bg-amber-50/50" : "hover:border-stone-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={user.image || ""} alt={user.name || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-semibold">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">
                          {user.name || "Sans nom"}
                        </p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs bg-amber-100 border-amber-300 text-amber-700">
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
                      <p className="font-bold text-lg">{user._count.recipes}</p>
                      <p className="text-muted-foreground text-xs">Recettes</p>
                    </div>
                    <div className="text-center px-3 border-l">
                      <p className="font-bold text-lg">{user._count.favorites}</p>
                      <p className="text-muted-foreground text-xs">Favoris</p>
                    </div>
                    <div className="text-center px-3 border-l hidden sm:block">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: fr })}
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
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <RoleIcon className="h-4 w-4" />
                              {role.label}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="READER" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              Lecteur
                              <span className="text-xs text-muted-foreground ml-2">Lecture seule</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="CONTRIBUTOR" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <ChefHat className="h-4 w-4 text-amber-500" />
                              Contributeur
                              <span className="text-xs text-muted-foreground ml-2">Peut créer</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`${role.color} border px-3 py-1.5`}>
                        <RoleIcon className="h-4 w-4 mr-1.5" />
                        {role.label}
                        {isAdmin && !isCurrentUser && (
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
      <div className="mt-8 p-4 rounded-xl bg-stone-50 border">
        <h4 className="font-semibold mb-3 text-sm">Légende des rôles</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">
              <User className="h-3 w-3 mr-1" />
              Lecteur
            </Badge>
            <p className="text-xs text-muted-foreground">Peut consulter les recettes et ajouter des favoris</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
              <ChefHat className="h-3 w-3 mr-1" />
              Contributeur
            </Badge>
            <p className="text-xs text-muted-foreground">Peut créer et modifier ses propres recettes</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge className="bg-red-100 text-red-700 border-red-200 border">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
            <p className="text-xs text-muted-foreground">Accès complet, gestion des utilisateurs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
