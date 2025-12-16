"use client";

import { useState, useEffect } from "react";
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
import { Users, Mail, UserPlus, Trash2, Eye, Edit3, Loader2 } from "lucide-react";
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
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"CONTRIBUTOR" | "VIEWER">("CONTRIBUTOR");
  const [error, setError] = useState("");

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

  const addContributor = async () => {
    if (!newEmail.trim()) {
      setError("Veuillez entrer un email");
      return;
    }

    setAdding(true);
    setError("");

    try {
      const res = await fetch(`/api/meal-planner/plan/${planId}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: newEmail, role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'ajout");
        return;
      }

      setContributors([data, ...contributors]);
      setNewEmail("");
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
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">
              <UserPlus className="h-4 w-4" />
              Inviter un contributeur
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addContributor()}
                  className="pl-10"
                />
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
                  className="bg-emerald-600 hover:bg-emerald-700"
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
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-emerald-600" />
              Gestion des contributeurs
            </SheetTitle>
            <SheetDescription className="text-left">
              Invitez des personnes à collaborer sur ce menu. Les contributeurs peuvent modifier et optimiser la liste de courses.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto max-h-[calc(85vh-8rem)] mt-4">
            {content}
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