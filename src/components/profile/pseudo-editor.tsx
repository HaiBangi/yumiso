"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Check, X, User } from "lucide-react";
import { updateUserPseudo } from "@/actions/users";

interface PseudoEditorProps {
  currentPseudo: string;
}

export function PseudoEditor({ currentPseudo }: PseudoEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pseudo, setPseudo] = useState(currentPseudo);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateUserPseudo(pseudo);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors cursor-pointer">
          <User className="h-3.5 w-3.5" />
          {currentPseudo}
          <Pencil className="h-3 w-3 ml-1" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier votre pseudo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Ce pseudo sera utilisé comme auteur de vos recettes
            </label>
            <Input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Votre pseudo"
              maxLength={50}
              disabled={isPending}
            />
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPseudo(currentPseudo);
                setOpen(false);
              }}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !pseudo.trim()}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Check className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

