import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-security";
import { db } from "@/lib/db";
import { InvitationStatus } from "@prisma/client";

/**
 * GET /api/invitations/count
 * Compte le nombre d'invitations en attente pour l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;

  try {
    const count = await db.invitation.count({
      where: {
        inviteeId: session.user.id,
        status: InvitationStatus.PENDING,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error counting invitations:", error);
    return NextResponse.json(
      { error: "Erreur lors du comptage des invitations" },
      { status: 500 }
    );
  }
}
