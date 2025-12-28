"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FolderOpen, ChevronRight, Edit, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { EditCollectionDialog } from "./edit-collection-dialog";
import { DeleteCollectionDialog } from "./delete-collection-dialog";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  color: string;
  _count: {
    recipes: number;
  };
  recipes: Array<{
    id: number;
    name: string;
    imageUrl: string | null;
  }>;
}

interface CollectionsManagerProps {
  collections: Collection[];
}

export function CollectionsManager({ 
  collections, 
}: CollectionsManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);

  return (
    <div className="space-y-6">
      {/* Actions Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {collections.length} {collections.length === 1 ? 'collection personnalisée' : 'collections personnalisées'}
        </p>
        <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle collection</span>
          <span className="sm:hidden">Nouveau</span>
        </Button>
      </div>

      {/* Custom Collections */}
      {collections.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <FolderOpen className="h-12 w-12 text-stone-300 dark:text-stone-600 mb-3" />
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
              Aucune collection personnalisée
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 text-center max-w-md mb-4">
              Créez votre première collection pour mieux organiser vos recettes
            </p>
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Créer une collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collections.map((collection) => (
            <div key={collection.id} className="relative group">
              <Link href={`/profile/collections/${collection.id}`}>
                <Card 
                  className="group/card hover:shadow-lg transition-all cursor-pointer border-2 hover:border-emerald-400 dark:hover:border-emerald-600"
                  style={{ borderColor: collection.color + '40' }}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-semibold text-stone-900 dark:text-stone-100 group-hover/card:text-emerald-600 dark:group-hover/card:text-emerald-400 transition-colors truncate">
                          {collection.name}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {collection._count.recipes} {collection._count.recipes === 1 ? 'recette' : 'recettes'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-stone-400 group-hover/card:text-emerald-600 dark:group-hover/card:text-emerald-400 group-hover/card:translate-x-1 transition-all flex-shrink-0" />
                    </div>

                    {/* Description */}
                    {collection.description && (
                      <p className="text-xs text-stone-600 dark:text-stone-400 mb-3 line-clamp-2">
                        {collection.description}
                      </p>
                    )}

                    {/* Preview */}
                    {collection.recipes.length > 0 && (
                      <div className="flex gap-1">
                        {collection.recipes.slice(0, 3).map((recipe) => (
                          <div
                            key={recipe.id}
                            className="flex-1 aspect-square rounded-md bg-stone-100 dark:bg-stone-700 overflow-hidden"
                          >
                            {recipe.imageUrl ? (
                              <img
                                src={recipe.imageUrl}
                                alt={recipe.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 dark:text-stone-500">
                                <FolderOpen className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>

              {/* Actions Menu - Positioned absolutely */}
              <div className="absolute top-2 right-2 z-10" onClick={(e) => e.preventDefault()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white/90 dark:bg-stone-800/90 hover:bg-white dark:hover:bg-stone-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingCollection(collection)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeletingCollection(collection)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateCollectionDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      
      {editingCollection && (
        <EditCollectionDialog
          open={!!editingCollection}
          onOpenChange={(open) => !open && setEditingCollection(null)}
          collection={editingCollection}
        />
      )}

      {deletingCollection && (
        <DeleteCollectionDialog
          open={!!deletingCollection}
          onOpenChange={(open) => !open && setDeletingCollection(null)}
          collection={deletingCollection}
        />
      )}
    </div>
  );
}
