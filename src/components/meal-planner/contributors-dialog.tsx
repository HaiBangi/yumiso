"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Mail, UserPlus, Trash2, Eye, Edit3, Loader2, AtSign, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";

interface Contributor {
  id: number;
  role: string;
  addedAt: string;
  user: {
    id: string;
    pseudo: string;
    email: string;
    image: string | null;
  };
}

interface UserSuggestion {
  id: string;
  pseudo: string;
  email: string;
  image: string | null;
}

interface ContributorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  isOwner: boolean;
}

export function ContributorsDialog({
  open,
  onOpenChange,
  planId,
  isOwner,
}: ContributorsDialogProps) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"email" | "pseudo">("pseudo");
  const [newRole, setNewRole] = useState<"CONTRIBUTOR" | "VIEWER">("CONTRIBUTOR");
  const [error, setError] = useState("");
  
  // Autocomplete pour pseudo
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchContributors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meal-planner/plan/${planId}/contributors`);
      if (res.ok) {
        const data = await res.json();
        setContributors(data);
      }
    } catch (error) {
      console.error("Erreur chargement contributeurs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && isOwner) {
      fetchContributors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planId, isOwner]);

  // Recherche d'utilisateurs par pseudo avec debounce
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Filtrer les utilisateurs déjà contributeurs
        const contributorIds = contributors.map(c => c.user.id);
        const filtered = data.filter((user: UserSuggestion) => !contributorIds.includes(user.id));
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      }
    } catch (error) {
      console.error("Erreur recherche utilisateurs:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [contributors]);

  // Debounce pour la recherche
  useEffect(() => {
    if (searchMode !== "pseudo" || !searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode, searchUsers]);

  // Fermer les suggestions quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectUser = (user: UserSuggestion) => {
    setSelectedUser(user);
    setSearchQuery(user.pseudo);
    setShowSuggestions(false);
  };

  const addContributor = async () => {
    // Validation
    if (searchMode === "email") {
      if (!searchQuery.trim() || !searchQuery.includes("@")) {
        setError("Veuillez entrer une adresse email valide");
        return;
      }
    } else {
      if (!selectedUser && !searchQuery.trim()) {
        setError("Veuillez sélectionner un utilisateur");
        return;
      }
    }

    setAdding(true);
    setError("");

    try {
      const payload = searchMode === "email"
        ? { userEmail: searchQuery.trim(), role: newRole }
        : { userId: selectedUser?.id, userPseudo: searchQuery.trim(), role: newRole };

      const res = await fetch(`/api/meal-planner/plan/${planId}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'ajout");
        return;
      }

      setContributors([data, ...contributors]);
      setSearchQuery("");
      setSelectedUser(null);
      setError("");
    } catch (error) {
      console.error("Erreur ajout:", error);
      setError("Erreur réseau");
    } finally {
      setAdding(false);
    }
  };

  const removeContributor = async (userId: string) => {
    try {
      const res = await fetch(
        `/api/meal-planner/plan/${planId}/contributors?userId=${userId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setContributors(contributors.filter((c) => c.user.id !== userId));
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
    }
  };

  const updateContributorRole = async (userId: string, newRole: "CONTRIBUTOR" | "VIEWER") => {
    try {
      const res = await fetch(`/api/meal-planner/plan/${planId}/contributors`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setContributors(contributors.map(c => 
          c.user.id === userId ? { ...c, role: newRole } : c
        ));
      }
    } catch (error) {
      console.error("Erreur mise à jour rôle:", error);
    }
  };

  const isMobile = useMediaQuery("(max-width: 768px)");

  const content = (
    <>
      {isOwner && (
        <div className="space-y-4 py-4">
          {/* Formulaire d'ajout */}
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">
              <UserPlus className="h-4 w-4" />
              Inviter un contributeur
            </div>
            
            {/* Toggle email/pseudo */}
            <div className="flex gap-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setSearchMode("pseudo");
                  setSearchQuery("");
                  setSelectedUser(null);
                  setError("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  searchMode === "pseudo"
                    ? "bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                <AtSign className="h-4 w-4" />
                Par pseudo
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode("email");
                  setSearchQuery("");
                  setSelectedUser(null);
                  setError("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  searchMode === "email"
                    ? "bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                <Mail className="h-4 w-4" />
                Par email
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                {searchMode === "email" ? (
                  <>
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 z-10" />
                    <Input
                      type="email"
                      placeholder="email@exemple.com"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addContributor()}
                      className="pl-10 !h-9 !py-0 !min-h-0"
                    />
                  </>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 z-10" />
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Rechercher par pseudo..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedUser(null);
                      }}
                      onFocus={() => searchQuery.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                      onKeyDown={(e) => e.key === "Enter" && addContributor()}
                      className="pl-10 !h-9 !py-0 !min-h-0"
                    />
                    {loadingSuggestions && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 animate-spin" />
                    )}
                    
                    {/* Dropdown suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {suggestions.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelectUser(user)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs">
                                {user.pseudo[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-stone-900 dark:text-stone-100">
                                {user.pseudo}
                              </div>
                              <div className="text-xs text-stone-500 truncate">
                                {user.email}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Select 
                  value={newRole} 
                  onValueChange={(v) => setNewRole(v as "CONTRIBUTOR" | "VIEWER")}
                >
                  <SelectTrigger className="w-full sm:w-[160px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTRIBUTOR">
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4" />
                        Contributeur
                      </div>
                    </SelectItem>
                    <SelectItem value="VIEWER">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Lecteur
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={addContributor}
                  disabled={adding}
                  className="bg-emerald-600 hover:bg-emerald-700 h-9"
                >
                  {adding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
              <p>• <strong>Contributeur</strong> : Peut modifier les repas et optimiser la liste de courses</p>
              <p>• <strong>Lecteur</strong> : Peut uniquement consulter le menu</p>
            </div>
          </div>

          {/* Liste des contributeurs */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-stone-700 dark:text-stone-300">
              {contributors.length} contributeur{contributors.length > 1 ? "s" : ""}
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : contributors.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun contributeur pour le moment</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contributors.map((contributor) => (
                  <div
                    key={contributor.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contributor.user.image || undefined} />
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                        {contributor.user.pseudo[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {contributor.user.pseudo}
                      </div>
                      <div className="text-xs text-stone-500 truncate">
                        {contributor.user.email}
                      </div>
                    </div>

                    <Select
                      value={contributor.role}
                      onValueChange={(v) => updateContributorRole(contributor.user.id, v as "CONTRIBUTOR" | "VIEWER")}
                    >
                      <SelectTrigger className="w-[130px] sm:w-[150px] h-9 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONTRIBUTOR">
                          <div className="flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-emerald-600" />
                            <span>Contributeur</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="VIEWER">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-stone-500" />
                            <span>Lecteur</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeContributor(contributor.user.id)}
                      className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] p-0 overflow-y-auto rounded-t-3xl">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-emerald-600" />
                Gestion des contributeurs
              </SheetTitle>
              <SheetDescription className="text-left">
                Invitez des personnes à collaborer sur ce menu. Les contributeurs peuvent modifier et optimiser la liste de courses.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              {content}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!max-w-[50vw] !w-[50vw] max-h-[95vh] overflow-y-auto scrollbar-thin" 
        style={{ 
          maxWidth: '50vw', 
          width: '50vw',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(120 113 108 / 0.5) transparent'
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-6 w-6 text-emerald-600" />
            Gestion des contributeurs
          </DialogTitle>
          <DialogDescription>
            Invitez des personnes à collaborer sur ce menu. Les contributeurs peuvent modifier et optimiser la liste de courses.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}