"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ShoppingCart,
  Loader2,
  MoreVertical,
  Trash2,
  Users,
  Calendar,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  Copy,
  X,
  Star,
  Search,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ContributorsDialog } from "@/components/shopping-lists/contributors-dialog";
import { InvitationsDialog } from "@/components/invitations/invitations-dialog";
import { useInvitations } from "@/hooks/use-invitations";

interface ShoppingList {
  id: number;
  name: string;
  description: string | null;
  color: string;
  userId: string;
  weeklyMealPlanId: number | null;
  weeklyMealPlan: {
    id: number;
    name: string;
  } | null;
  isPublic: boolean;
  isFavorite: boolean;
  shareCode: string | null;
  createdAt: string;
  updatedAt: string;
  totalItems: number;
  checkedItems: number;
  isOwner: boolean;
  userRole: "VIEWER" | "EDITOR" | "ADMIN" | null;
  user: { id: string; pseudo: string; name: string | null; image: string | null };
  contributors: Array<{
    id: number;
    role: string;
    user: { id: string; pseudo: string; name: string | null; image: string | null };
  }>;
}

export default function ShoppingListsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showContributorsDialog, setShowContributorsDialog] = useState(false);
  const [showInvitationsDialog, setShowInvitationsDialog] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const ITEMS_PER_PAGE = 9;
  const { count: invitationCount, refresh: refreshInvitations } = useInvitations();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/shopping-lists");
      return;
    }
    if (status === "authenticated") {
      fetchLists();
    }
  }, [status, router]);

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/shopping-lists");
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Impossible de charger les listes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/shopping-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim(), description: newListDescription.trim() || null }),
      });
      if (res.ok) {
        const newList = await res.json();
        setLists(prev => [{ ...newList, totalItems: 0, checkedItems: 0, isOwner: true, contributors: [], isFavorite: false }, ...prev]);
        setShowCreateDialog(false);
        setNewListName("");
        setNewListDescription("");
        toast.success("Liste créée");
        router.push(`/shopping-lists/${newList.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Erreur");
      }
    } catch {
      toast.error("Erreur");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteList = async () => {
    if (!listToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/shopping-lists/${listToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setLists(prev => prev.filter(l => l.id !== listToDelete.id));
        toast.success("Liste supprimée");
        setShowDeleteDialog(false);
        setListToDelete(null);
      } else {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleFavorite = async (listId: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const newValue = !list.isFavorite;

    // Optimistic update
    setLists(prev => prev.map(l => l.id === listId ? { ...l, isFavorite: newValue } : l));

    try {
      const res = await fetch(`/api/shopping-lists/${listId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newValue }),
      });
      if (!res.ok) {
        // Revert on error
        setLists(prev => prev.map(l => l.id === listId ? { ...l, isFavorite: !newValue } : l));
        toast.error("Erreur");
      }
    } catch {
      // Revert on error
      setLists(prev => prev.map(l => l.id === listId ? { ...l, isFavorite: !newValue } : l));
      toast.error("Erreur");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Trier les listes: favoris > date modif > nom alphabétique
  const sortLists = (listsToSort: ShoppingList[]) => {
    return [...listsToSort].sort((a, b) => {
      // 1. Favoris en premier
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // 2. Date de modification (plus récent en premier)
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      if (dateA !== dateB) return dateB - dateA;

      // 3. Nom alphabétique
      return a.name.localeCompare(b.name, 'fr');
    });
  };

  const sortedLists = sortLists(lists);
  const linkedLists = sortLists(lists.filter(l => l.weeklyMealPlanId !== null));
  const standaloneLists = sortLists(lists.filter(l => l.weeklyMealPlanId === null));

  // Filtrer par recherche
  const filterBySearch = (listsToFilter: ShoppingList[]) => {
    if (!searchQuery.trim()) return listsToFilter;
    const query = searchQuery.toLowerCase().trim();
    return listsToFilter.filter(list => {
      const displayName = list.weeklyMealPlanId && list.weeklyMealPlan
        ? list.weeklyMealPlan.name
        : list.name;
      return displayName.toLowerCase().includes(query);
    });
  };

  // Réinitialiser la page quand on change d'onglet ou de recherche
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Obtenir la liste à afficher selon l'onglet actuel
  const getCurrentLists = () => {
    let baseLists: ShoppingList[];
    switch (currentTab) {
      case "linked": baseLists = linkedLists; break;
      case "standalone": baseLists = standaloneLists; break;
      default: baseLists = sortedLists;
    }
    return filterBySearch(baseLists);
  };

  const currentLists = getCurrentLists();
  const totalPages = Math.ceil(currentLists.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLists = currentLists.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Composant de pagination
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-6 pt-4 border-t border-stone-200 dark:border-stone-700">
        <span className="text-xs text-stone-500 order-2 sm:order-1">
          Page {currentPage} sur {totalPages}
        </span>

        <div className="flex items-center gap-1.5 order-1 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 px-2 sm:px-3 text-xs"
          >
            ← <span className="hidden sm:inline ml-1">Précédent</span>
          </Button>

          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              const showPage = page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1;

              if (!showPage) {
                if (page === 2 && currentPage > 3) return <span key={page} className="px-1 text-stone-400 text-xs">...</span>;
                if (page === totalPages - 1 && currentPage < totalPages - 2) return <span key={page} className="px-1 text-stone-400 text-xs">...</span>;
                return null;
              }

              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <span className="sm:hidden text-xs font-medium text-stone-600 dark:text-stone-400 px-2">
            {currentPage} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 px-2 sm:px-3 text-xs"
          >
            <span className="hidden sm:inline mr-1">Suivant</span> →
          </Button>
        </div>
      </div>
    );
  };

  const getProgressColor = (checked: number, total: number) => {
    if (total === 0) return "bg-stone-200 dark:bg-stone-700";
    const percent = (checked / total) * 100;
    if (percent === 100) return "bg-emerald-500";
    if (percent >= 50) return "bg-amber-500";
    return "bg-blue-500";
  };

  const renderListCard = (list: ShoppingList) => {
    const isComplete = list.totalItems > 0 && list.checkedItems === list.totalItems;
    const isLinkedToMenu = list.weeklyMealPlanId !== null;

    // Pour les listes de menu, on affiche juste le nom du menu
    const displayName = isLinkedToMenu && list.weeklyMealPlan ? list.weeklyMealPlan.name : list.name;

    // Couleurs et styles différenciés selon le type ET l'état
    let iconColor: string;
    let iconBgColor: string;
    let cardBgClass: string;
    let borderClass: string;

    if (isComplete) {
      if (isLinkedToMenu) {
        // Menu complété - vert foncé avec bordure
        iconColor = "#059669"; // emerald-600
        iconBgColor = "rgba(5, 150, 105, 0.15)";
        cardBgClass = 'bg-emerald-50/70 dark:bg-emerald-950/30';
        borderClass = 'border-2 border-emerald-300 dark:border-emerald-700';
      } else {
        // Perso complétée - violet/purple pour différencier
        iconColor = "#7c3aed"; // violet-600
        iconBgColor = "rgba(124, 58, 237, 0.15)";
        cardBgClass = 'bg-violet-50/70 dark:bg-violet-950/30';
        borderClass = 'border-2 border-violet-300 dark:border-violet-700';
      }
    } else {
      if (isLinkedToMenu) {
        // Menu non complété - vert clair
        iconColor = "#10b981"; // emerald-500
        iconBgColor = "rgba(16, 185, 129, 0.1)";
        cardBgClass = 'bg-emerald-50/30 dark:bg-emerald-950/10';
        borderClass = 'border border-emerald-200/50 dark:border-emerald-800/50';
      } else {
        // Perso non complétée - bleu
        iconColor = "#3b82f6"; // blue-500
        iconBgColor = "rgba(59, 130, 246, 0.1)";
        cardBgClass = 'bg-blue-50/30 dark:bg-blue-950/10';
        borderClass = 'border border-blue-200/50 dark:border-blue-800/50';
      }
    }

    return (
      <Card
        key={list.id}
        className={`group relative transition-all duration-200 hover:shadow-md ${cardBgClass} ${borderClass}`}
      >
        <Link href={`/shopping-lists/${list.id}`} className="block p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: iconBgColor }}
            >
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5" style={{ color: iconColor }} />
              ) : (
                <ShoppingCart className="h-5 w-5" style={{ color: iconColor }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base text-stone-900 dark:text-stone-100 truncate">
                  {displayName}
                </h3>
                {!list.isOwner && list.userRole && (
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${
                    list.userRole === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : list.userRole === 'EDITOR'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                  }`}>
                    {list.userRole === 'ADMIN' ? 'Admin' : list.userRole === 'EDITOR' ? 'Éditeur' : 'Lecteur'}
                  </span>
                )}
              </div>
            </div>

            {/* Bouton favori */}
            <button
              onClick={(e) => handleToggleFavorite(list.id, e)}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Star
                className={`h-4 w-4 ${list.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-stone-300 hover:text-amber-400'}`}
              />
            </button>

            {/* Menu 3 points */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 h-8 w-8 p-0 hover:bg-stone-100 dark:hover:bg-stone-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-stone-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                {list.weeklyMealPlanId && (
                  <DropdownMenuItem onSelect={(e) => {
                    e.preventDefault();
                    router.push(`/meal-planner?plan=${list.weeklyMealPlanId}`);
                  }}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Voir le menu
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(`${window.location.origin}/shopping-lists/${list.id}`);
                  toast.success("Lien copié !");
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le lien
                </DropdownMenuItem>
                {list.isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => {
                      e.preventDefault();
                      setSelectedList(list);
                      setShowContributorsDialog(true);
                    }}>
                      <Users className="h-4 w-4 mr-2" />
                      Gérer les accès
                    </DropdownMenuItem>
                  </>
                )}
                {list.isOwner && !list.weeklyMealPlanId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onSelect={(e) => {
                        e.preventDefault();
                        setListToDelete(list);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Progression */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressColor(list.checkedItems, list.totalItems)}`}
                style={{ width: `${list.totalItems > 0 ? (list.checkedItems / list.totalItems) * 100 : 0}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${isComplete ? 'text-emerald-600' : 'text-stone-600 dark:text-stone-400'}`}>
              {list.checkedItems}/{list.totalItems}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(list.updatedAt)}</span>
            </div>

            <TooltipProvider>
              <div className="flex items-center -space-x-1.5">
                <Tooltip>
                  <TooltipTrigger>
                    <Avatar className="h-6 w-6 border-2 border-white dark:border-stone-900 ring-1 ring-amber-400">
                      <AvatarImage src={list.user.image || undefined} />
                      <AvatarFallback className="text-[9px] bg-amber-100 text-amber-700">
                        {(list.user.pseudo || list.user.name || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {list.user.pseudo || list.user.name}
                  </TooltipContent>
                </Tooltip>

                {list.contributors?.slice(0, 2).map((c) => (
                  <Tooltip key={c.id}>
                    <TooltipTrigger>
                      <Avatar className="h-6 w-6 border-2 border-white dark:border-stone-900">
                        <AvatarImage src={c.user.image || undefined} />
                        <AvatarFallback className="text-[9px] bg-stone-100 text-stone-600">
                          {(c.user.pseudo || c.user.name || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {c.user.pseudo || c.user.name}
                    </TooltipContent>
                  </Tooltip>
                ))}

                {(list.contributors?.length ?? 0) > 2 && (
                  <div className="h-6 w-6 rounded-full border-2 border-white dark:border-stone-900 bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
                    <span className="text-[9px] font-medium text-stone-600 dark:text-stone-300">
                      +{(list.contributors?.length ?? 0) - 2}
                    </span>
                  </div>
                )}
              </div>
            </TooltipProvider>
          </div>
        </Link>
      </Card>
    );
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Listes de Courses
            </h1>
            <p className="text-xs text-stone-500">
              {lists.length} liste{lists.length !== 1 ? "s" : ""} • {linkedLists.length} menu • {standaloneLists.length} perso
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowInvitationsDialog(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 relative"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Invitations</span>
            {invitationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                {invitationCount}
              </span>
            )}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle</span>
          </Button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      {lists.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Barre de recherche */}
            <div className="relative w-full sm:flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                type="text"
                placeholder="Rechercher une liste..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9 bg-white dark:bg-stone-800"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filtres sur desktop uniquement */}
            <div className="hidden sm:block">
              <div className="inline-flex h-9 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800 p-1 text-stone-500 dark:text-stone-400">
                <button
                  onClick={() => handleTabChange("all")}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                    currentTab === "all"
                      ? "bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50 shadow"
                      : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  }`}
                >
                  Toutes ({lists.length})
                </button>
                <button
                  onClick={() => handleTabChange("linked")}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                    currentTab === "linked"
                      ? "bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50 shadow"
                      : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  }`}
                >
                  Listes liées à un menu ({linkedLists.length})
                </button>
                <button
                  onClick={() => handleTabChange("standalone")}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                    currentTab === "standalone"
                      ? "bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50 shadow"
                      : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  }`}
                >
                  Listes indépendantes ({standaloneLists.length})
                </button>
              </div>
            </div>
          </div>
          {searchQuery && (
            <p className="mt-2 text-xs text-stone-500">
              {currentLists.length} résultat{currentLists.length !== 1 ? "s" : ""} pour &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      )}

      {/* Contenu */}
      {lists.length === 0 ? (
        <Card className="p-8 text-center max-w-md mx-auto">
          <ShoppingCart className="h-10 w-10 mx-auto text-emerald-600 mb-3" />
          <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-2">Aucune liste</h2>
          <p className="text-sm text-stone-500 mb-4">Créez votre première liste de courses.</p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Créer une liste
          </Button>
        </Card>
      ) : (
        <Tabs value={currentTab} className="w-full" onValueChange={handleTabChange}>
          {/* Filtres sur mobile uniquement */}
          <TabsList className="sm:hidden mb-4 h-9 w-full">
            <TabsTrigger value="all" className="text-sm px-4 flex-1">Toutes ({lists.length})</TabsTrigger>
            <TabsTrigger value="linked" className="text-sm px-4 flex-1">Menus ({linkedLists.length})</TabsTrigger>
            <TabsTrigger value="standalone" className="text-sm px-4 flex-1">Perso ({standaloneLists.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {currentLists.length === 0 && searchQuery ? (
              <Card className="p-6 text-center">
                <Search className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                <p className="text-sm text-stone-500">Aucune liste trouvée pour &quot;{searchQuery}&quot;</p>
                <Button onClick={() => handleSearchChange("")} variant="outline" size="sm" className="mt-3 gap-1.5">
                  <X className="h-4 w-4" />
                  Effacer la recherche
                </Button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedLists.map(renderListCard)}
                </div>
                <PaginationControls />
              </>
            )}
          </TabsContent>

          <TabsContent value="linked">
            {currentLists.length === 0 ? (
              <Card className="p-6 text-center">
                <CalendarDays className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                <p className="text-sm text-stone-500">
                  {searchQuery ? `Aucune liste de menu trouvée pour "${searchQuery}"` : "Aucune liste liée à un menu"}
                </p>
                {searchQuery && (
                  <Button onClick={() => handleSearchChange("")} variant="outline" size="sm" className="mt-3 gap-1.5">
                    <X className="h-4 w-4" />
                    Effacer la recherche
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedLists.map(renderListCard)}
                </div>
                <PaginationControls />
              </>
            )}
          </TabsContent>

          <TabsContent value="standalone">
            {currentLists.length === 0 ? (
              <Card className="p-6 text-center">
                <ListTodo className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                <p className="text-sm text-stone-500 mb-3">
                  {searchQuery ? `Aucune liste personnelle trouvée pour "${searchQuery}"` : "Aucune liste personnelle"}
                </p>
                {searchQuery ? (
                  <Button onClick={() => handleSearchChange("")} variant="outline" size="sm" className="gap-1.5">
                    <X className="h-4 w-4" />
                    Effacer la recherche
                  </Button>
                ) : (
                  <Button onClick={() => setShowCreateDialog(true)} variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Créer
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedLists.map(renderListCard)}
                </div>
                <PaginationControls />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              Nouvelle liste
            </DialogTitle>
            <DialogDescription>Créez une liste personnelle.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (newListName.trim() && !isCreating) handleCreateList(); }} className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input id="name" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Ex: Courses de la semaine" className="mt-1" autoFocus />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={newListDescription} onChange={(e) => setNewListDescription(e.target.value)} placeholder="Optionnel" className="mt-1 resize-none" rows={2} />
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateList} disabled={isCreating || !newListName.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Supprimer la liste
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la liste &quot;{listToDelete?.name}&quot; ?
              {listToDelete?.weeklyMealPlanId && (
                <span className="block mt-2 text-amber-600 dark:text-amber-500">
                  ⚠️ Cette liste est liée au menu &quot;{listToDelete.weeklyMealPlan?.name}&quot;
                </span>
              )}
              <span className="block mt-2 font-semibold">Cette action est irréversible.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setListToDelete(null);
              }}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDeleteList}
              disabled={isDeleting}
              variant="destructive"
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog contributeurs */}
      {selectedList && (
        <ContributorsDialog
          open={showContributorsDialog}
          onOpenChange={setShowContributorsDialog}
          listId={selectedList.id}
          isOwner={selectedList.isOwner}
          onUpdate={fetchLists}
        />
      )}

      {/* Dialog invitations */}
      <InvitationsDialog
        open={showInvitationsDialog}
        onOpenChange={setShowInvitationsDialog}
        onInvitationChange={() => {
          refreshInvitations();
          fetchLists();
        }}
      />
    </div>
  );
}
