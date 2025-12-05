"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { MessageSquareText, Save, Trash2, Loader2 } from "lucide-react";
import { saveUserNote, deleteUserNote } from "@/actions/notes";

interface PersonalNoteProps {
  recipeId: number;
  initialNote?: string | null;
}

export function PersonalNote({ recipeId, initialNote }: PersonalNoteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState(initialNote || "");
  const [savedNote, setSavedNote] = useState(initialNote || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNote(initialNote || "");
    setSavedNote(initialNote || "");
  }, [initialNote]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Small delay to ensure the sheet is fully open
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!note.trim()) {
      handleDelete();
      return;
    }
    setIsSaving(true);
    const result = await saveUserNote(recipeId, note.trim());
    if (result.success) {
      setSavedNote(note.trim());
      setIsOpen(false);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteUserNote(recipeId);
    if (result.success) {
      setNote("");
      setSavedNote("");
      setIsOpen(false);
    }
    setIsDeleting(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset note to saved value when closing without saving
      setNote(savedNote);
    }
    setIsOpen(open);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const hasChanges = note.trim() !== savedNote;
  const hasNote = !!savedNote;

  return (
    <>
      {/* Trigger Button - Always shows "Ma note" */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`gap-2 transition-all ${
          hasNote
            ? "text-amber-600 border-amber-200 bg-amber-50/50 hover:bg-amber-100/80 hover:border-amber-300"
            : "text-stone-500 border-stone-200 hover:bg-stone-50 hover:text-stone-700 hover:border-stone-300"
        }`}
      >
        <MessageSquareText className="h-4 w-4" />
        <span>Mes notes personnelles</span>
        {hasNote && (
          <span className="ml-1 w-2 h-2 rounded-full bg-amber-400" />
        )}
      </Button>

      {/* Sheet Panel */}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="border-b border-stone-100 pb-4">
            <SheetTitle className="flex items-center gap-2 font-serif text-xl">
              <MessageSquareText className="h-5 w-5 text-amber-500" />
              Mes notes personnelles
            </SheetTitle>
            <SheetDescription>
              Ajoutez vos astuces, modifications ou rappels pour cette recette.
              Seul vous pouvez voir cette note.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 py-6 px-1">
            <Textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: J'ai ajouté un peu plus d'ail, c'était parfait ! Cuisson 5 min de plus la prochaine fois..."
              className="min-h-[200px] resize-none text-base leading-relaxed border-stone-200 focus:border-amber-300 focus:ring-amber-200/50"
            />
            <p className="text-xs text-stone-400 mt-3 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-mono">
                Ctrl
              </kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-mono">
                Entrée
              </kbd>
              <span className="ml-1">pour sauvegarder</span>
            </p>
          </div>

          <SheetFooter className="border-t border-stone-100 pt-4 flex-row gap-2">
            {hasNote && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Supprimer
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || isDeleting || !hasChanges}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

