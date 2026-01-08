import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-security";
import { db } from "@/lib/db";
import { InvitationStatus } from "@prisma/client";

/**
 * POST /api/invitations/[id]/cancel
 * Annule une invitation envoyée (uniquement par l'envoyeur)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;
  const resolvedParams = await Promise.resolve(params);
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

    // Vérifier que l'utilisateur est bien l'envoyeur
    if (invitation.inviterId !== session.user.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à annuler cette invitation" },
        { status: 403 }
      );
    }

    // Vérifier que l'invitation est en attente
    if (invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json(
        { error: "Cette invitation ne peut plus être annulée" },
        { status: 400 }
      );
    }

    // Annuler l'invitation
    await db.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.CANCELLED,
        respondedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Invitation annulée avec succès",
    });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de l'invitation" },
      { status: 500 }
    );
  }
}
