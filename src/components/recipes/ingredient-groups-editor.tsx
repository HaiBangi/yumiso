"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, GripVertical, FolderPlus, Edit2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface IngredientInput {
  id: string;
  name: string;
  quantityUnit: string;
}

interface IngredientGroupInput {
  id: string;
  name: string;
  ingredients: IngredientInput[];
  isEditing?: boolean;
}

interface IngredientGroupsEditorProps {
  groups: IngredientGroupInput[];
  onChange: (groups: IngredientGroupInput[]) => void;
  disabled?: boolean;
}

export function IngredientGroupsEditor({
  groups,
  onChange,
  disabled = false,
}: IngredientGroupsEditorProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  const addGroup = () => {
    const newGroup: IngredientGroupInput = {
      id: `group-${Date.now()}`,
      name: "Nouveau groupe",
      ingredients: [
        { id: `ing-${Date.now()}`, name: "", quantityUnit: "" },
      ],
      isEditing: true,
    };
    onChange([...groups, newGroup]);
    setEditingGroupId(newGroup.id);
    setEditingGroupName(newGroup.name);
  };

  const removeGroup = (groupId: string) => {
    if (groups.length === 1) return; // Toujours garder au moins un groupe
    onChange(groups.filter((g) => g.id !== groupId));
  };

  const updateGroupName = (groupId: string, name: string) => {
    onChange(
      groups.map((g) => (g.id === groupId ? { ...g, name } : g))
    );
  };

  const startEditingGroupName = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditingGroupName(currentName);
  };

  const saveGroupName = (groupId: string) => {
    if (editingGroupName.trim()) {
      updateGroupName(groupId, editingGroupName.trim());
    }
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const cancelEditingGroupName = () => {
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const addIngredientToGroup = (groupId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              ingredients: [
                ...g.ingredients,
                {
                  id: `ing-${Date.now()}`,
                  name: "",
                  quantityUnit: "",
                },
              ],
            }
          : g
      )
    );
  };

  const removeIngredientFromGroup = (groupId: string, ingredientId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              ingredients: g.ingredients.filter((i) => i.id !== ingredientId),
            }
          : g
      )
    );
  };

  const updateIngredient = (
    groupId: string,
    ingredientId: string,
    field: keyof IngredientInput,
    value: string
  ) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              ingredients: g.ingredients.map((i) =>
                i.id === ingredientId ? { ...i, [field]: value } : i
              ),
            }
          : g
      )
    );
  };

  // Drag and drop pour réorganiser les groupes
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);

  const handleGroupDragStart = (e: React.DragEvent, groupId: string) => {
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleGroupDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleGroupDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();

    if (!draggedGroupId || draggedGroupId === targetGroupId) {
      setDraggedGroupId(null);
      return;
    }

    const draggedIndex = groups.findIndex((g) => g.id === draggedGroupId);
    const targetIndex = groups.findIndex((g) => g.id === targetGroupId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedGroupId(null);
      return;
    }

    const newGroups = [...groups];
    const [draggedGroup] = newGroups.splice(draggedIndex, 1);
    newGroups.splice(targetIndex, 0, draggedGroup);

    onChange(newGroups);
    setDraggedGroupId(null);
  };

  const handleGroupDragEnd = () => {
    setDraggedGroupId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header avec bouton d'ajout de groupe */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <FolderPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Groupes d'ingrédients
          <span className="text-xs text-stone-500 font-normal">
            (Glisser-déposer pour réorganiser)
          </span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addGroup}
          disabled={disabled}
          className="h-7 text-xs border-emerald-300 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 cursor-pointer"
        >
          <FolderPlus className="h-3.5 w-3.5 mr-1" />
          Ajouter un groupe
        </Button>
      </div>

      {/* Liste des groupes */}
      <div className="space-y-4">
        {groups.map((group, groupIndex) => (
          <Card
            key={group.id}
            draggable={!disabled}
            onDragStart={(e) => handleGroupDragStart(e, group.id)}
            onDragOver={handleGroupDragOver}
            onDrop={(e) => handleGroupDrop(e, group.id)}
            onDragEnd={handleGroupDragEnd}
            className={`p-4 border-2 transition-all ${
              draggedGroupId === group.id
                ? "opacity-50 scale-95 border-emerald-400"
                : "border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700"
            }`}
          >
            {/* Header du groupe */}
            <div className="flex items-center gap-3 mb-4">
              <GripVertical className="h-5 w-5 text-stone-400 cursor-grab active:cursor-grabbing flex-shrink-0" />

              {editingGroupId === group.id ? (
                // Mode édition du nom
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveGroupName(group.id);
                      } else if (e.key === "Escape") {
                        cancelEditingGroupName();
                      }
                    }}
                    placeholder="Nom du groupe..."
                    className="h-8 text-sm font-semibold"
                    autoFocus
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => saveGroupName(group.id)}
                    className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditingGroupName}
                    className="h-7 px-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                // Mode affichage du nom
                <>
                  <h4 className="flex-1 font-semibold text-stone-800 dark:text-stone-100 text-sm">
                    {group.name} <span className="text-xs text-stone-500 font-normal">({group.ingredients.length})</span>
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditingGroupName(group.id, group.name)}
                    disabled={disabled}
                    className="h-7 px-2 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addIngredientToGroup(group.id)}
                disabled={disabled}
                className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </Button>

              {groups.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGroup(group.id)}
                  disabled={disabled}
                  className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Liste des ingrédients du groupe */}
            <div className="space-y-2 pl-8">
              {group.ingredients.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2">
                  Aucun ingrédient dans ce groupe
                </p>
              ) : (
                <>
                  {/* Header row pour desktop */}
                  <div className="hidden sm:grid sm:grid-cols-[80px_1fr_40px] gap-2 text-xs text-stone-500 dark:text-stone-400 font-medium px-2">
                    <span className="text-center">Qté + Unité</span>
                    <span className="pl-1">Ingrédient</span>
                    <span></span>
                  </div>

                  {group.ingredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="grid grid-cols-[70px_1fr_40px] sm:grid-cols-[80px_1fr_40px] gap-2 items-center px-2 py-2 rounded-lg bg-stone-50 dark:bg-stone-700/30 border border-stone-200 dark:border-stone-600 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
                    >
                      <Input
                        value={ingredient.quantityUnit}
                        onChange={(e) =>
                          updateIngredient(
                            group.id,
                            ingredient.id,
                            "quantityUnit",
                            e.target.value
                          )
                        }
                        placeholder="150g"
                        disabled={disabled}
                        className="h-11 text-sm text-center bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 placeholder:text-xs placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                        title="Ex: 150g, 1 c.à.s, 2 kg, etc."
                      />
                      <Input
                        value={ingredient.name}
                        onChange={(e) =>
                          updateIngredient(
                            group.id,
                            ingredient.id,
                            "name",
                            e.target.value
                          )
                        }
                        placeholder="Nom de l'ingrédient..."
                        disabled={disabled}
                        className="h-11 text-sm border-stone-200 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          removeIngredientFromGroup(group.id, ingredient.id)
                        }
                        disabled={disabled || group.ingredients.length === 1}
                        className="h-10 w-10 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-lg">
          <FolderPlus className="h-12 w-12 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">
            Aucun groupe d'ingrédients
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addGroup}
            disabled={disabled}
            className="cursor-pointer"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Créer un groupe
          </Button>
        </div>
      )}
    </div>
  );
}

