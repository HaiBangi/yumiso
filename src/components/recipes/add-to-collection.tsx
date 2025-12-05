"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus, Check, Plus, Folder } from "lucide-react";
import { createCollection, addRecipeToCollection, removeRecipeFromCollection } from "@/actions/collections";

interface Collection {
  id: number;
  name: string;
  color: string;
  recipes: { id: number }[];
}

interface AddToCollectionProps {
  recipeId: number;
  collections: Collection[];
}

export function AddToCollection({ recipeId, collections }: AddToCollectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleCollection = async (collectionId: number, isInCollection: boolean) => {
    setIsLoading(true);
    if (isInCollection) {
      await removeRecipeFromCollection(collectionId, recipeId);
    } else {
      await addRecipeToCollection(collectionId, recipeId);
    }
    setIsLoading(false);
  };

  const handleCreateCollection = async () => {
    if (!newName.trim()) return;
    setIsLoading(true);
    const result = await createCollection({ name: newName.trim() });
    if (result.success && result.collection) {
      await addRecipeToCollection(result.collection.id, recipeId);
    }
    setNewName("");
    setIsCreating(false);
    setIsLoading(false);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-amber-600 border-amber-200 hover:bg-amber-50"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Collections
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {collections.length === 0 ? (
            <div className="px-2 py-3 text-sm text-stone-500 text-center">
              Aucune collection
            </div>
          ) : (
            collections.map((collection) => {
              const isInCollection = collection.recipes.some((r) => r.id === recipeId);
              return (
                <DropdownMenuItem
                  key={collection.id}
                  onClick={() => handleToggleCollection(collection.id, isInCollection)}
                  disabled={isLoading}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Folder
                      className="h-4 w-4"
                      style={{ color: collection.color }}
                    />
                    <span>{collection.name}</span>
                  </div>
                  {isInCollection && <Check className="h-4 w-4 text-green-600" />}
                </DropdownMenuItem>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              setIsCreating(true);
            }}
            className="cursor-pointer text-amber-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la collection</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Repas de la semaine"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCollection} disabled={isLoading || !newName.trim()}>
              {isLoading ? "Création..." : "Créer et ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

