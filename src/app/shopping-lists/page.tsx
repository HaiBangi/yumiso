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
  UserPlus,
  Crown,
  Eye,
  Edit3,
  Copy,
  X,
  Star
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showContributorsDialog, setShowContributorsDialog] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newContributorEmail, setNewContributorEmail] = useState("");
  const [newContributorRole, setNewContributorRole] = useState("CONTRIBUTOR");
  const [isAddingContributor, setIsAddingContributor] = useState(false);

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

  const handleDeleteList = async (listId: number) => {
    if (!confirm("Supprimer cette liste ?")) return;
    try {
      const res = await fetch(`/api/shopping-lists/${listId}`, { method: "DELETE" });
      if (res.ok) {
        setLists(prev => prev.filter(l => l.id !== listId));
        toast.success("Liste supprimée");
      } else {
        toast.error("Erreur");
      }
    } catch {
      toast.error("Erreur");
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

  const handleAddContributor = async () => {
    if (!selectedList || !newContributorEmail.trim()) return;
    setIsAddingContributor(true);
    try {
      const res = await fetch(`/api/shopping-lists/${selectedList.id}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newContributorEmail.trim(), role: newContributorRole }),
      });
      if (res.ok) {
        const updatedList = await res.json();
        setLists(prev => prev.map(l => l.id === selectedList.id ? { ...l, contributors: updatedList.contributors } : l));
        setSelectedList({ ...selectedList, contributors: updatedList.contributors });
        setNewContributorEmail("");
        toast.success("Contributeur ajouté");
      } else {
        const error = await res.json();
        toast.error(error.error || "Erreur");
      }
    } catch {
      toast.error("Erreur");
    } finally {
      setIsAddingContributor(false);
    }
  };

  const handleRemoveContributor = async (contributorId: number) => {
    if (!selectedList) return;
    try {
      const res = await fetch(`/api/shopping-lists/${selectedList.id}/contributors/${contributorId}`, { method: "DELETE" });
      if (res.ok) {
        const newContributors = selectedList.contributors.filter(c => c.id !== contributorId);
        setLists(prev => prev.map(l => l.id === selectedList.id ? { ...l, contributors: newContributors } : l));
        setSelectedList({ ...selectedList, contributors: newContributors });
        toast.success("Contributeur retiré");
      } else {
        toast.error("Erreur");
      }
    } catch {
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
    const iconColor = isLinkedToMenu ? "#10b981" : "#3b82f6";
    const iconBgColor = isLinkedToMenu ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)";
    
    // Pour les listes de menu, on affiche juste le nom du menu
    const displayName = isLinkedToMenu && list.weeklyMealPlan ? list.weeklyMealPlan.name : list.name;
    
    // Background color selon le type
    const cardBgClass = isComplete 
      ? 'bg-emerald-50/50 dark:bg-emerald-950/20' 
      : isLinkedToMenu 
        ? 'bg-emerald-50/30 dark:bg-emerald-950/10' 
        : 'bg-blue-50/30 dark:bg-blue-950/10';
    
    return (
      <Card 
        key={list.id} 
        className={`group relative transition-all duration-200 hover:shadow-md ${cardBgClass}`}
      >
        <Link href={`/shopping-lists/${list.id}`} className="block p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div 
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                isComplete ? 'bg-emerald-100 dark:bg-emerald-900/50' : ''
              }`}
              style={{ backgroundColor: isComplete ? undefined : iconBgColor }}
            >
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <ShoppingCart className="h-5 w-5" style={{ color: iconColor }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base text-stone-900 dark:text-stone-100 truncate">
                {displayName}
              </h3>
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
                <DropdownMenuItem onSelect={(e) => {
                  e.preventDefault();
                  handleToggleFavorite(list.id);
                }}>
                  <Star className={`h-4 w-4 mr-2 ${list.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  {list.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
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
                        handleDeleteList(list.id);
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
        <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle</span>
        </Button>
      </div>

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
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 h-9">
            <TabsTrigger value="all" className="text-sm px-4">Toutes ({lists.length})</TabsTrigger>
            <TabsTrigger value="linked" className="text-sm px-4">Menus ({linkedLists.length})</TabsTrigger>
            <TabsTrigger value="standalone" className="text-sm px-4">Perso ({standaloneLists.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedLists.map(renderListCard)}
            </div>
          </TabsContent>

          <TabsContent value="linked">
            {linkedLists.length === 0 ? (
              <Card className="p-6 text-center">
                <CalendarDays className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                <p className="text-sm text-stone-500">Aucune liste liée à un menu</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {linkedLists.map(renderListCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="standalone">
            {standaloneLists.length === 0 ? (
              <Card className="p-6 text-center">
                <ListTodo className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                <p className="text-sm text-stone-500 mb-3">Aucune liste personnelle</p>
                <Button onClick={() => setShowCreateDialog(true)} variant="outline" size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Créer
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {standaloneLists.map(renderListCard)}
              </div>
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
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input id="name" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Ex: Courses de la semaine" className="mt-1" autoFocus />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={newListDescription} onChange={(e) => setNewListDescription(e.target.value)} placeholder="Optionnel" className="mt-1 resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateList} disabled={isCreating || !newListName.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog contributeurs */}
      <Dialog open={showContributorsDialog} onOpenChange={setShowContributorsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Gérer les accès
            </DialogTitle>
            <DialogDescription>{selectedList?.name}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-2 block">Ajouter un contributeur</Label>
              <div className="flex gap-2">
                <Input type="email" value={newContributorEmail} onChange={(e) => setNewContributorEmail(e.target.value)} placeholder="Email" className="flex-1" />
                <Select value={newContributorRole} onValueChange={setNewContributorRole}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTRIBUTOR"><span className="flex items-center gap-1.5"><Edit3 className="h-3 w-3" />Éditeur</span></SelectItem>
                    <SelectItem value="VIEWER"><span className="flex items-center gap-1.5"><Eye className="h-3 w-3" />Lecteur</span></SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddContributor} disabled={isAddingContributor || !newContributorEmail.trim()} className="px-3 bg-emerald-600 hover:bg-emerald-700">
                  {isAddingContributor ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-sm mb-2 block">Personnes ({(selectedList?.contributors?.length ?? 0) + 1})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={selectedList?.user.image || undefined} />
                      <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                        {(selectedList?.user.pseudo || selectedList?.user.name || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{selectedList?.user.pseudo || selectedList?.user.name}</p>
                      <p className="text-xs text-amber-600 flex items-center gap-0.5"><Crown className="h-3 w-3" />Propriétaire</p>
                    </div>
                  </div>
                </div>
                
                {selectedList?.contributors?.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={c.user.image || undefined} />
                        <AvatarFallback className="text-xs">{(c.user.pseudo || c.user.name || "?")[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{c.user.pseudo || c.user.name}</p>
                        <p className={`text-xs flex items-center gap-0.5 ${c.role === "VIEWER" ? 'text-blue-600' : 'text-purple-600'}`}>
                          {c.role === "VIEWER" ? <><Eye className="h-3 w-3" />Lecteur</> : <><Edit3 className="h-3 w-3" />Éditeur</>}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveContributor(c.id)} className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {selectedList?.contributors?.length === 0 && (
                  <p className="text-sm text-stone-400 text-center py-3 italic">Aucun contributeur</p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContributorsDialog(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
