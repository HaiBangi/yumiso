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
  Share2,
  Users,
  Calendar,
  CalendarDays,
  ListTodo,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { toast } from "sonner";

interface ShoppingList {
  id: number;
  name: string;
  description: string | null;
  color: string;
  userId: string;
  weeklyMealPlanId: number | null;
  weeklyMealPlan: { id: number; name: string } | null;
  isPublic: boolean;
  shareCode: string | null;
  createdAt: string;
  updatedAt: string;
  totalItems: number;
  checkedItems: number;
  isOwner: boolean;
  user: { id: string; pseudo: string; name: string | null; image: string | null };
  contributors?: Array<{
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");

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
      console.error("Erreur lors du chargement des listes:", error);
      toast.error("Impossible de charger les listes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error("Le nom de la liste est requis");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/shopping-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim() || null,
        }),
      });

      if (res.ok) {
        const newList = await res.json();
        setLists(prev => [{ ...newList, totalItems: 0, checkedItems: 0, isOwner: true, contributors: [] }, ...prev]);
        setShowCreateDialog(false);
        setNewListName("");
        setNewListDescription("");
        toast.success("Liste créée avec succès");
        router.push(`/shopping-lists/${newList.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de la création");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la création de la liste");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteList = async (listId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette liste ?")) return;

    try {
      const res = await fetch(`/api/shopping-lists/${listId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLists(prev => prev.filter(l => l.id !== listId));
        toast.success("Liste supprimée");
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  // Séparer les listes liées aux menus des listes indépendantes
  const linkedLists = lists.filter(l => l.weeklyMealPlanId !== null);
  const standaloneLists = lists.filter(l => l.weeklyMealPlanId === null);

  const getProgressColor = (checked: number, total: number) => {
    if (total === 0) return "bg-stone-200 dark:bg-stone-700";
    const percent = (checked / total) * 100;
    if (percent === 100) return "bg-emerald-500";
    if (percent >= 50) return "bg-amber-500";
    return "bg-blue-500";
  };

  const renderListCard = (list: ShoppingList) => {
    const contributorsCount = list.contributors?.length ?? 0;
    const progress = list.totalItems > 0 ? Math.round((list.checkedItems / list.totalItems) * 100) : 0;
    const isComplete = list.totalItems > 0 && list.checkedItems === list.totalItems;
    
    return (
      <Card 
        key={list.id} 
        className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
          list.weeklyMealPlanId ? 'border-l-4 border-l-emerald-500' : ''
        } ${isComplete ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}
      >
        <Link href={`/shopping-lists/${list.id}`} className="block p-4 sm:p-5">
          {/* Badge si lié à un menu */}
          {list.weeklyMealPlan && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                <CalendarDays className="h-3 w-3" />
                <span className="hidden sm:inline">Menu</span>
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start gap-3 mb-3 pr-16 sm:pr-20">
            <div 
              className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                isComplete ? 'bg-emerald-100 dark:bg-emerald-900/50' : ''
              }`}
              style={{ backgroundColor: isComplete ? undefined : list.color + "15" }}
            >
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              ) : (
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: list.color }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 text-sm sm:text-base leading-tight">
                {list.name}
              </h3>
              {list.weeklyMealPlan ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 line-clamp-1 mt-1">
                  {list.weeklyMealPlan.name}
                </p>
              ) : list.description ? (
                <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-1">
                  {list.description}
                </p>
              ) : null}
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
              <span className="text-stone-500 dark:text-stone-400">
                {list.checkedItems}/{list.totalItems} articles
              </span>
              <span className={`font-semibold ${isComplete ? 'text-emerald-600' : 'text-stone-700 dark:text-stone-300'}`}>
                {progress}%
              </span>
            </div>
            <div className="h-1.5 sm:h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(list.checkedItems, list.totalItems)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-stone-400 dark:text-stone-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(list.updatedAt)}
            </div>
            <div className="flex items-center gap-2">
              {contributorsCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {contributorsCount + 1}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Menu contextuel */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ right: list.weeklyMealPlan ? '70px' : undefined }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {list.weeklyMealPlanId && (
                <DropdownMenuItem onClick={() => router.push(`/meal-planner?plan=${list.weeklyMealPlanId}`)}>
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Voir le menu
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/shopping-lists/${list.id}`);
                toast.success("Lien copié !");
              }}>
                <Share2 className="h-4 w-4 mr-2" />
                Copier le lien
              </DropdownMenuItem>
              {list.isOwner && !list.weeklyMealPlanId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => handleDeleteList(list.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-stone-500">Chargement des listes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header compact */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 sm:gap-3">
            <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />
            Listes de Courses
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {lists.length} liste{lists.length !== 1 ? "s" : ""} 
            {linkedLists.length > 0 && (
              <span className="hidden sm:inline"> • {linkedLists.length} liée{linkedLists.length > 1 ? 's' : ''} à un menu</span>
            )}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nouvelle liste
        </Button>
      </div>

      {/* Contenu */}
      {lists.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-stone-700 dark:text-stone-300 mb-2">
            Aucune liste de courses
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-md mx-auto">
            Créez votre première liste pour commencer à organiser vos courses, ou générez-en une depuis le planificateur de repas.
          </p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Créer une liste
          </Button>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Toutes</span>
              <span className="hidden sm:inline">({lists.length})</span>
            </TabsTrigger>
            <TabsTrigger value="linked" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Menus</span>
              <span className="hidden sm:inline">({linkedLists.length})</span>
            </TabsTrigger>
            <TabsTrigger value="standalone" className="gap-1.5 text-xs sm:text-sm">
              <ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Perso</span>
              <span className="hidden sm:inline">({standaloneLists.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {lists.map(renderListCard)}
            </div>
          </TabsContent>

          <TabsContent value="linked">
            {linkedLists.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <CalendarDays className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
                <p className="text-stone-500 dark:text-stone-400 text-sm">
                  Aucune liste liée à un menu.
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                  Créez un menu depuis le planificateur de repas.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {linkedLists.map(renderListCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="standalone">
            {standaloneLists.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <ListTodo className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
                <p className="text-stone-500 dark:text-stone-400 text-sm mb-4">
                  Aucune liste personnelle.
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer une liste
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {standaloneLists.map(renderListCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog de création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              Nouvelle liste
            </DialogTitle>
            <DialogDescription>
              Créez une liste pour organiser vos courses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ex: Courses de la semaine"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Ex: Pour le dîner de samedi"
                className="mt-1.5 resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateList}
              disabled={isCreating || !newListName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
