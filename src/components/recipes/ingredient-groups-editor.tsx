"use client";

import { useState, useRef } from "react";
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
  const [draggedIngredient, setDraggedIngredient] = useState<{ groupId: string; ingredientId: string } | null>(null);
  const [dragOverIngredient, setDragOverIngredient] = useState<{ groupId: string; ingredientId: string } | null>(null);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [activeIngredient, setActiveIngredient] = useState<{ groupId: string; ingredientId: string } | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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
    if (groups.length === 1) return;
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
    const newIngId = `ing-${Date.now()}`;
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              ingredients: [
                ...g.ingredients,
                {
                  id: newIngId,
                  name: "",
                  quantityUnit: "",
                },
              ],
            }
          : g
      )
    );
    setTimeout(() => {
      const input = inputRefs.current[`${groupId}-${newIngId}-qty`];
      if (input) input.focus();
    }, 50);
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

  const handleQuantityKeyDown = (e: React.KeyboardEvent, groupId: string, ingredientId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nameInput = inputRefs.current[`${groupId}-${ingredientId}-name`];
      if (nameInput) nameInput.focus();
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent, groupId: string, _ingredientId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredientToGroup(groupId);
    }
  };

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

  const handleIngredientDragStart = (e: React.DragEvent, groupId: string, ingredientId: string) => {
    setDraggedIngredient({ groupId, ingredientId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleIngredientDragOver = (e: React.DragEvent, groupId: string, ingredientId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    // Track which ingredient is being hovered over for visual feedback
    setDragOverIngredient({ groupId, ingredientId });
  };

  const handleIngredientDragLeave = () => {
    setDragOverIngredient(null);
  };

  const handleIngredientDrop = (e: React.DragEvent, targetGroupId: string, targetIngredientId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedIngredient) return;

    const { groupId: sourceGroupId, ingredientId: sourceIngredientId } = draggedIngredient;

    // Don't do anything if dropping on itself
    if (sourceGroupId === targetGroupId && sourceIngredientId === targetIngredientId) {
      setDraggedIngredient(null);
      setDragOverIngredient(null);
      return;
    }

    const sourceGroup = groups.find(g => g.id === sourceGroupId);
    const ingredient = sourceGroup?.ingredients.find(i => i.id === sourceIngredientId);

    if (!ingredient) {
      setDraggedIngredient(null);
      setDragOverIngredient(null);
      return;
    }

    if (sourceGroupId === targetGroupId) {
      // SAME GROUP: Reorder ingredients within the same group
      const group = groups.find(g => g.id === sourceGroupId);
      if (!group) return;

      const sourceIndex = group.ingredients.findIndex(i => i.id === sourceIngredientId);
      const targetIndex = group.ingredients.findIndex(i => i.id === targetIngredientId);

      if (sourceIndex === -1 || targetIndex === -1) return;

      const newIngredients = [...group.ingredients];
      const [movedIngredient] = newIngredients.splice(sourceIndex, 1);
      newIngredients.splice(targetIndex, 0, movedIngredient);

      const newGroups = groups.map(g => 
        g.id === sourceGroupId 
          ? { ...g, ingredients: newIngredients }
          : g
      );

      onChange(newGroups);
    } else {
      // DIFFERENT GROUP: Move ingredient to another group
      const targetGroup = groups.find(g => g.id === targetGroupId);
      if (!targetGroup) return;

      const targetIndex = targetGroup.ingredients.findIndex(i => i.id === targetIngredientId);

      const newGroups = groups.map(g => {
        if (g.id === sourceGroupId) {
          return {
            ...g,
            ingredients: g.ingredients.filter(i => i.id !== sourceIngredientId)
          };
        }
        if (g.id === targetGroupId) {
          const newIngredients = [...g.ingredients];
          // Insert at the target position
          newIngredients.splice(targetIndex, 0, ingredient);
          return {
            ...g,
            ingredients: newIngredients
          };
        }
        return g;
      });

      onChange(newGroups);
    }

    setDraggedIngredient(null);
    setDragOverIngredient(null);
  };

  const handleIngredientDragEnd = () => {
    setDraggedIngredient(null);
    setDragOverIngredient(null);
  };

  const handleGroupAreaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleGroupAreaDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedIngredient) return;

    const { groupId: sourceGroupId, ingredientId } = draggedIngredient;

    // If dropping in the same group and there are no ingredients, do nothing
    if (sourceGroupId === targetGroupId) {
      setDraggedIngredient(null);
      setDragOverIngredient(null);
      return;
    }

    const sourceGroup = groups.find(g => g.id === sourceGroupId);
    const ingredient = sourceGroup?.ingredients.find(i => i.id === ingredientId);

    if (!ingredient) {
      setDraggedIngredient(null);
      setDragOverIngredient(null);
      return;
    }

    // Move ingredient to the end of the target group
    const newGroups = groups.map(g => {
      if (g.id === sourceGroupId) {
        return {
          ...g,
          ingredients: g.ingredients.filter(i => i.id !== ingredientId)
        };
      }
      if (g.id === targetGroupId) {
        return {
          ...g,
          ingredients: [...g.ingredients, ingredient]
        };
      }
      return g;
    });

    onChange(newGroups);
    setDraggedIngredient(null);
    setDragOverIngredient(null);
  };

  const handleGroupNameDoubleClick = (groupId: string, currentName: string) => {
    if (!disabled) {
      startEditingGroupName(groupId, currentName);
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="space-y-4">
        {groups.map((group) => (
          <Card
            key={group.id}
            draggable={!disabled}
            onDragStart={(e) => handleGroupDragStart(e, group.id)}
            onDragOver={handleGroupDragOver}
            onDrop={(e) => handleGroupDrop(e, group.id)}
            onDragEnd={handleGroupDragEnd}
            className={`p-2.5 sm:p-4 border-2 transition-all ${
              draggedGroupId === group.id
                ? "opacity-50 scale-95 border-emerald-400"
                : "border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700"
            }`}
          >
            {/* Header du groupe */}
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-stone-400 cursor-grab active:cursor-grabbing flex-shrink-0" />
              {editingGroupId === group.id ? (
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
                <>
                  <h4 
                    className="flex-1 font-semibold text-stone-800 dark:text-stone-100 text-xs sm:text-sm cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors min-w-0 truncate"
                    onDoubleClick={() => handleGroupNameDoubleClick(group.id, group.name)}
                    title="Double-cliquez pour renommer"
                  >
                    {group.name} <span className="text-xs text-stone-500 font-normal">({group.ingredients.length})</span>
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditingGroupName(group.id, group.name)}
                    disabled={disabled}
                    className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 flex-shrink-0"
                  >
                    <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addIngredientToGroup(group.id)}
                disabled={disabled}
                className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 cursor-pointer flex-shrink-0"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>

              {groups.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGroup(group.id)}
                  disabled={disabled}
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer flex-shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>

            <div 
              className="space-y-1.5"
              onDragOver={handleGroupAreaDragOver}
              onDrop={(e) => handleGroupAreaDrop(e, group.id)}
            >
              {group.ingredients.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2 text-center">
                  Aucun ingrédient dans ce groupe (glissez un ingrédient ici)
                </p>
              ) : (
                <>
                  <div className="hidden sm:grid sm:grid-cols-[32px_70px_1fr_36px] gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-medium px-1 mb-1">
                    <span></span>
                    <span className="text-center">Qté</span>
                    <span className="pl-1">Ingrédient</span>
                    <span></span>
                  </div>

                  {group.ingredients.map((ingredient) => {
                    const isDragging = draggedIngredient?.ingredientId === ingredient.id;
                    const isDropTarget = dragOverIngredient?.ingredientId === ingredient.id && !isDragging;
                    const isActive = activeIngredient?.groupId === group.id && activeIngredient?.ingredientId === ingredient.id;

                    return (
                    <div
                      key={ingredient.id}
                      draggable={!disabled && !isActive}
                      onDragStart={(e) => handleIngredientDragStart(e, group.id, ingredient.id)}
                      onDragOver={(e) => handleIngredientDragOver(e, group.id, ingredient.id)}
                      onDragLeave={handleIngredientDragLeave}
                      onDrop={(e) => handleIngredientDrop(e, group.id, ingredient.id)}
                      onDragEnd={handleIngredientDragEnd}
                      className={`relative grid grid-cols-[32px_65px_1fr_36px] sm:grid-cols-[32px_70px_1fr_36px] gap-1.5 items-center px-1.5 py-1 rounded-md bg-stone-50 dark:bg-stone-700/30 border transition-all ${
                        !isActive ? 'cursor-grab active:cursor-grabbing' : ''
                      } ${
                        isDragging
                          ? 'opacity-50 border-stone-300 dark:border-stone-500 scale-95'
                          : isDropTarget
                          ? 'border-emerald-500 dark:border-emerald-400 border-2 scale-[1.02] shadow-lg'
                          : 'border-stone-200 dark:border-stone-600 hover:border-emerald-300 dark:hover:border-emerald-600'
                      }`}
                      title={!isActive ? "Glisser pour réorganiser les ingrédients" : ""}
                    >
                      {/* Indicateur visuel de drop */}
                      {isDropTarget && (
                        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent rounded-full animate-pulse" />
                      )}

                      {/* Icône grip pour indiquer visuellement la zone de drag */}
                      <div className="flex items-center justify-center">
                        <GripVertical className="h-4 w-4 text-stone-400" />
                      </div>
                      <Input
                        ref={(el) => { inputRefs.current[`${group.id}-${ingredient.id}-qty`] = el; }}
                        value={ingredient.quantityUnit}
                        onChange={(e) =>
                          updateIngredient(
                            group.id,
                            ingredient.id,
                            "quantityUnit",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => handleQuantityKeyDown(e, group.id, ingredient.id)}
                        onMouseDown={() => setActiveIngredient({ groupId: group.id, ingredientId: ingredient.id })}
                        onFocus={() => setActiveIngredient({ groupId: group.id, ingredientId: ingredient.id })}
                        onBlur={() => setActiveIngredient(null)}
                        placeholder="150g"
                        disabled={disabled}
                        className="h-8 text-xs text-center bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 placeholder:text-xs placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500 cursor-text"
                        title="Ex: 150g, 1 c.à.s - Enter pour passer au nom"
                      />
                      <Input
                        ref={(el) => { inputRefs.current[`${group.id}-${ingredient.id}-name`] = el; }}
                        value={ingredient.name}
                        onChange={(e) =>
                          updateIngredient(
                            group.id,
                            ingredient.id,
                            "name",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => handleNameKeyDown(e, group.id, ingredient.id)}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Nom..."
                        disabled={disabled}
                        className="h-8 text-xs border-stone-200 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100 placeholder:text-xs placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500 cursor-text"
                        title="Enter pour ajouter un nouvel ingrédient"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          removeIngredientFromGroup(group.id, ingredient.id)
                        }
                        disabled={disabled || group.ingredients.length === 1}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                  })}
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
