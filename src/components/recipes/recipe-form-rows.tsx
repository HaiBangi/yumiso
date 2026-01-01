"use client";

import React, { memo, useCallback, useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

// ==================== INGREDIENT ROW ====================

interface IngredientRowProps {
  id: string;
  quantityUnit: string;
  name: string;
  onUpdate: (id: string, field: "quantityUnit" | "name", value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

/**
 * Composant d'ingrédient mémorisé avec état local pour éviter les re-renders du parent
 */
export const IngredientRow = memo(function IngredientRow({
  id,
  quantityUnit: externalQuantityUnit,
  name: externalName,
  onUpdate,
  onRemove,
  canRemove,
}: IngredientRowProps) {
  // État local pour une frappe fluide
  const [localQuantityUnit, setLocalQuantityUnit] = useState(externalQuantityUnit);
  const [localName, setLocalName] = useState(externalName);

  const quantityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync quand les valeurs externes changent (ex: import, reset)
  useEffect(() => {
    setLocalQuantityUnit(externalQuantityUnit);
  }, [externalQuantityUnit]);

  useEffect(() => {
    setLocalName(externalName);
  }, [externalName]);

  const handleQuantityUnitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuantityUnit(value);

    if (quantityTimeoutRef.current) clearTimeout(quantityTimeoutRef.current);
    quantityTimeoutRef.current = setTimeout(() => {
      onUpdate(id, "quantityUnit", value);
    }, 200);
  }, [id, onUpdate]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalName(value);

    if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
    nameTimeoutRef.current = setTimeout(() => {
      onUpdate(id, "name", value);
    }, 200);
  }, [id, onUpdate]);

  // Sync immédiat sur blur
  const handleQuantityUnitBlur = useCallback(() => {
    if (quantityTimeoutRef.current) {
      clearTimeout(quantityTimeoutRef.current);
      quantityTimeoutRef.current = null;
    }
    onUpdate(id, "quantityUnit", localQuantityUnit);
  }, [id, localQuantityUnit, onUpdate]);

  const handleNameBlur = useCallback(() => {
    if (nameTimeoutRef.current) {
      clearTimeout(nameTimeoutRef.current);
      nameTimeoutRef.current = null;
    }
    onUpdate(id, "name", localName);
  }, [id, localName, onUpdate]);

  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (quantityTimeoutRef.current) clearTimeout(quantityTimeoutRef.current);
      if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
    };
  }, []);

  return (
    <div className="grid grid-cols-[70px_1fr_40px] sm:grid-cols-[80px_1fr_40px] gap-2 items-center px-2 py-1.5 rounded-lg bg-white dark:bg-stone-700/50 border border-stone-100 dark:border-stone-600 hover:border-emerald-200 dark:hover:border-emerald-600 transition-colors">
      <Input
        value={localQuantityUnit}
        onChange={handleQuantityUnitChange}
        onBlur={handleQuantityUnitBlur}
        placeholder="150g"
        className="h-8 text-sm text-center bg-stone-50 dark:bg-stone-700 border-stone-200 dark:border-stone-600 dark:text-stone-100 placeholder:text-xs placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
        title="Ex: 150g, 1 c.à.s, 2 kg, etc."
      />
      <Input
        value={localName}
        onChange={handleNameChange}
        onBlur={handleNameBlur}
        placeholder="Nom de l'ingrédient..."
        className="h-8 text-sm border-stone-200 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleRemove}
        disabled={!canRemove}
        className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer disabled:opacity-30"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

// ==================== STEP ROW ====================

interface StepRowProps {
  id: string;
  index: number;
  text: string;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

/**
 * Composant d'étape mémorisé avec état local pour éviter les re-renders du parent.
 * Retourne uniquement le Textarea et le bouton supprimer (le wrapper et le numéro sont gérés par le parent pour le drag-and-drop).
 */
export const StepRow = memo(function StepRow({
  id,
  index,
  text: externalText,
  onUpdate,
  onRemove,
  canRemove,
}: StepRowProps) {
  const [localText, setLocalText] = useState(externalText);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync quand la valeur externe change
  useEffect(() => {
    setLocalText(externalText);
  }, [externalText]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalText(value);

    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onUpdate(id, value);
    }, 200);
  }, [id, onUpdate]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Ensure correct height on focus
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  }, []);

  const handleBlur = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onUpdate(id, localText);
  }, [id, localText, onUpdate]);

  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Retourne un Fragment avec le textarea et le bouton (pas de wrapper, pas de numéro)
  return (
    <>
      <Textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={`Décrivez l'étape ${index + 1}...`}
        className="flex-1 text-sm border-stone-200 dark:border-stone-600 resize-none bg-stone-50 dark:bg-stone-700 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-600 placeholder:text-sm placeholder:italic placeholder:text-stone-400 dark:placeholder:text-stone-500 min-h-[80px] leading-relaxed cursor-text"
        style={{ overflow: 'hidden' }}
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.stopPropagation()}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleRemove}
        disabled={!canRemove}
        className="h-10 w-10 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0 cursor-pointer disabled:opacity-30 self-start"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );
});
