"use client";

import { useState } from "react";
import { Pencil, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { toast } from "sonner";

interface StoreManagementMenuProps {
  storeId: number;
  storeName: string;
  isGlobal?: boolean;
  itemIds: number[]; // IDs des items de cette enseigne dans CETTE liste uniquement
}

export function StoreManagementMenu({
  storeId,
  storeName,
  isGlobal = false,
  itemIds,
}: StoreManagementMenuProps) {
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleMoveToStore = async () => {
    if (!newStoreName.trim()) {
      toast.error("Le nom de l'enseigne est requis");
      return;
    }

    setIsMoving(true);
    try {
      console.log(`[StoreManagement] Déplacement de ${itemIds.length} items vers "${newStoreName.trim()}"`);

      // 1. Créer ou trouver l'enseigne cible
      const storeRes = await fetch("/api/stores/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: newStoreName.trim() }),
      });

      if (!storeRes.ok) {
        const errorData = await storeRes.json();
        throw new Error(errorData.error || "Erreur lors de la création de l'enseigne");
      }

      const { store } = await storeRes.json();
      console.log(`[StoreManagement] Enseigne cible trouvée/créée:`, store);

      // 2. Déplacer tous les items en batch
      const moveRes = await fetch("/api/shopping-list/move-store-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds,
          newStoreId: store.id,
        }),
      });

      if (!moveRes.ok) {
        const errorData = await moveRes.json();
        throw new Error(errorData.error || "Erreur lors du déplacement des items");
      }

      const moveData = await moveRes.json();
      console.log(`[StoreManagement] Résultat déplacement:`, moveData);

      toast.success(`${moveData.movedCount} article(s) déplacé(s) de "${storeName}" vers "${store.name}"`);
      setShowMoveDialog(false);
      setNewStoreName("");
      // Pas de reload - le SSE mettra à jour automatiquement
    } catch (error: any) {
      console.error("[StoreManagement] Erreur:", error);
      toast.error(error.message || "Erreur lors du déplacement");
    } finally {
      setIsMoving(false);
    }
  };

  const handleClearStore = async () => {
    setIsClearing(true);
    try {
      // Déplacer tous les items vers "Sans enseigne" (storeId = null)
      const moveRes = await fetch("/api/shopping-list/move-store-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds,
          newStoreId: null, // null = "Sans enseigne"
        }),
      });

      if (!moveRes.ok) {
        const errorData = await moveRes.json();
        throw new Error(errorData.error || "Erreur lors du vidage");
      }

      const moveData = await moveRes.json();

      toast.success(`${moveData.movedCount} article(s) retiré(s) de "${storeName}"`);
      setShowClearDialog(false);
      // Pas de reload - le SSE mettra à jour automatiquement
    } catch (error: any) {
      console.error("[StoreManagement] Erreur:", error);
      toast.error(error.message || "Erreur lors du vidage");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveDialog(true);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Déplacer vers...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowClearDialog(true);
            }}
            className="text-orange-600 dark:text-orange-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Vider cette enseigne
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de déplacement vers une autre enseigne */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déplacer les articles</DialogTitle>
            <DialogDescription>
              Déplacer tous les articles de "{storeName}" vers une autre enseigne.
              <br />
              {itemIds.length} article(s) sera/seront déplacé(s).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newStoreName">Nom de l'enseigne de destination</Label>
              <Input
                id="newStoreName"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Ex: Carrefour, Lidl..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isMoving) {
                    handleMoveToStore();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Si l'enseigne n'existe pas, elle sera créée automatiquement.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMoveDialog(false)}
              disabled={isMoving}
            >
              Annuler
            </Button>
            <Button onClick={handleMoveToStore} disabled={isMoving || !newStoreName.trim()}>
              {isMoving ? "Déplacement..." : "Déplacer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de vidage (déplacement vers "Sans enseigne") */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vider l'enseigne "{storeName}" ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer tous les articles de "{storeName}" ?
              <br />
              <br />
              Les {itemIds.length} article(s) seront déplacés vers "Sans enseigne" dans <strong>cette liste uniquement</strong>.
              <br />
              <br />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                L'enseigne elle-même ne sera pas supprimée et restera disponible pour d'autres listes.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearStore}
              disabled={isClearing}
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
            >
              {isClearing ? "Vidage..." : "Vider"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
