"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Check,
  X,
  ShoppingCart,
  Calendar,
  Loader2,
  Mail,
  Clock,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { InvitationType } from "@prisma/client";
import { useRouter } from "next/navigation";

interface Invitation {
  id: number;
  type: InvitationType;
  role: string;
  message?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  inviter: {
    id: string;
    pseudo: string;
    email: string;
    image: string | null;
  };
  shoppingList?: {
    id: number;
    name: string;
    color: string;
    icon: string;
  } | null;
  weeklyMealPlan?: {
    id: number;
    name: string;
    weekStart: string;
    weekEnd: string;
  } | null;
}

interface InvitationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvitationChange?: () => void;
}

export function InvitationsDialog({
  open,
  onOpenChange,
  onInvitationChange,
}: InvitationsDialogProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const router = useRouter();

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invitations?status=PENDING");
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      } else {
        toast.error("Erreur lors du chargement des invitations");
      }
    } catch (error) {
      console.error("Erreur chargement invitations:", error);
      toast.error("Erreur lors du chargement des invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchInvitations();
    }
  }, [open]);

  const handleAccept = async (invitationId: number) => {
    setProcessingId(invitationId);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Invitation acceptée !");
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        onInvitationChange?.();

        // Rediriger vers la liste/planificateur
        if (data.redirectUrl) {
          setTimeout(() => {
            router.push(data.redirectUrl);
            onOpenChange(false);
          }, 500);
        }
      } else {
        toast.error(data.error || "Erreur lors de l'acceptation");
      }
    } catch (error) {
      console.error("Erreur acceptation invitation:", error);
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invitationId: number) => {
    setProcessingId(invitationId);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Invitation refusée");
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        onInvitationChange?.();
      } else {
        toast.error(data.error || "Erreur lors du refus");
      }
    } catch (error) {
      console.error("Erreur refus invitation:", error);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      VIEWER: "Lecteur",
      EDITOR: "Éditeur",
      ADMIN: "Administrateur",
      CONTRIBUTOR: "Contributeur",
    };
    return roleLabels[role] || role;
  };

  const getRoleDescription = (role: string, type: InvitationType) => {
    if (type === InvitationType.SHOPPING_LIST) {
      const descriptions: Record<string, string> = {
        VIEWER: "Peut uniquement voir et cocher les articles",
        EDITOR: "Peut modifier et cocher les articles",
        ADMIN: "Peut gérer les contributeurs et modifier la liste",
      };
      return descriptions[role] || "";
    } else {
      const descriptions: Record<string, string> = {
        VIEWER: "Peut uniquement consulter le menu",
        CONTRIBUTOR: "Peut modifier les repas et optimiser la liste",
      };
      return descriptions[role] || "";
    }
  };

  const InvitationCard = ({ invitation }: { invitation: Invitation }) => {
    const isExpiringSoon =
      invitation.expiresAt &&
      new Date(invitation.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

    return (
      <div className="border rounded-lg p-4 space-y-4 bg-card hover:bg-accent/50 transition-colors">
        {/* Header avec type et invitant */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={invitation.inviter.image || ""} />
              <AvatarFallback>
                {invitation.inviter.pseudo.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {invitation.inviter.pseudo}
                </span>
                <span className="text-muted-foreground text-xs">
                  vous invite à rejoindre
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {invitation.type === InvitationType.SHOPPING_LIST ? (
                  <ShoppingCart className="h-4 w-4 text-green-600" />
                ) : (
                  <Calendar className="h-4 w-4 text-blue-600" />
                )}
                <span className="font-semibold text-sm">
                  {invitation.shoppingList?.name || invitation.weeklyMealPlan?.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rôle proposé */}
        <div className="bg-accent/50 rounded-md p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Rôle proposé
            </span>
            <span className="text-sm font-semibold">
              {getRoleLabel(invitation.role)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {getRoleDescription(invitation.role, invitation.type)}
          </p>
        </div>

        {/* Message optionnel */}
        {invitation.message && (
          <div className="flex gap-2 items-start">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{invitation.message}&rdquo;
            </p>
          </div>
        )}

        {/* Infos temporelles */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(invitation.createdAt), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
          {isExpiringSoon && invitation.expiresAt && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertCircle className="h-3 w-3" />
              <span>
                Expire{" "}
                {formatDistanceToNow(new Date(invitation.expiresAt), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => handleAccept(invitation.id)}
            disabled={processingId === invitation.id}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            {processingId === invitation.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Accepter
              </>
            )}
          </Button>
          <Button
            onClick={() => handleReject(invitation.id)}
            disabled={processingId === invitation.id}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            {processingId === invitation.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Refuser
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const content = (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucune invitation en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <InvitationCard key={invitation.id} invitation={invitation} />
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Invitations reçues</SheetTitle>
            <SheetDescription>
              Acceptez ou refusez les invitations à collaborer
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 overflow-y-auto max-h-[calc(85vh-8rem)]">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invitations reçues</DialogTitle>
          <DialogDescription>
            Acceptez ou refusez les invitations à collaborer
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
