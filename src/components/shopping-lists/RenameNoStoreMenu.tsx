"use client";

import { useState } from "react";
import { Pencil, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { toast } from "sonner";

interface RenameNoStoreMenuProps {
  itemIds: number[];
  onStoreCreated?: () => void;
}

export function RenameNoStoreMenu({
  itemIds,
  onStoreCreated,
}: RenameNoStoreMenuProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newStoreName.trim()) {
      toast.error("Le nom de l'enseigne est requis");
      return;
    }

    setIsCreating(true);
    try {
      // 1. Créer ou trouver l'enseigne
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

      // 2. Déplacer tous les items vers cette enseigne EN UNE SEULE REQUÊTE BATCH
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

      toast.success(`${moveData.movedCount} article(s) déplacé(s) vers "${store.name}"`);
      setShowDialog(false);
      setNewStoreName("");
      // Ne pas recharger la page, le SSE mettra à jour automatiquement
    } catch (error: any) {
      console.error('[RenameNoStore] Erreur:', error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setIsCreating(false);
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
        <DropdownMenuContent align="end" style={{ zIndex: 'var(--z-popover)' }}>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowDialog(true);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Créer une enseigne
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une enseigne</DialogTitle>
            <DialogDescription>
              Tous les articles "Sans enseigne" seront déplacés vers cette nouvelle enseigne.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nom de l'enseigne</Label>
              <Input
                id="storeName"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Ex: Carrefour, Lidl..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreating) {
                    handleCreate();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isCreating}
            >
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !newStoreName.trim()}>
              {isCreating ? "Création..." : "Créer et déplacer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
