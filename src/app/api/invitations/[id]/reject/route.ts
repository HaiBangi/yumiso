import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-security";
import { db } from "@/lib/db";
import { InvitationStatus } from "@prisma/client";

/**
 * POST /api/invitations/[id]/reject
 * Refuse une invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;
  const resolvedParams = await params;
  const invitationId = parseInt(resolvedParams.id);

  if (isNaN(invitationId)) {
    return NextResponse.json(
      { error: "ID d'invitation invalide" },
      { status: 400 }
    );
  }

  try {
    // Récupérer l'invitation
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est bien le destinataire
    if (invitation.inviteeId !== session.user.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à refuser cette invitation" },
        { status: 403 }
      );
    }

    // Vérifier que l'invitation est en attente
    if (invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json(
        { error: "Cette invitation n'est plus valide" },
        { status: 400 }
      );
    }

    // Refuser l'invitation
    await db.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Invitation refusée avec succès",
    });
  } catch (error) {
    console.error("Error rejecting invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors du refus de l'invitation" },
      { status: 500 }
    );
  }
}
