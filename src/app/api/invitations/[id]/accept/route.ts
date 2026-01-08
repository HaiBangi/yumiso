import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-security";
import { db } from "@/lib/db";
import { InvitationStatus, InvitationType } from "@prisma/client";

/**
 * POST /api/invitations/[id]/accept
 * Accepte une invitation et ajoute l'utilisateur comme contributeur
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
      include: {
        shoppingList: true,
        weeklyMealPlan: true,
      },
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
        { error: "Vous n'êtes pas autorisé à accepter cette invitation" },
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

    // Vérifier si l'invitation a expiré
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await db.invitation.update({
        where: { id: invitationId },
        data: {
          status: InvitationStatus.EXPIRED,
          respondedAt: new Date(),
        },
      });
      return NextResponse.json(
        { error: "Cette invitation a expiré" },
        { status: 400 }
      );
    }

    // Accepter l'invitation et créer le contributeur selon le type
    if (invitation.type === InvitationType.SHOPPING_LIST && invitation.shoppingListId) {
      // Vérifier que la liste existe toujours
      if (!invitation.shoppingList) {
        return NextResponse.json(
          { error: "La liste de courses n'existe plus" },
          { status: 404 }
        );
      }

      // Vérifier si l'utilisateur n'est pas déjà contributeur
      const existingContributor = await db.shoppingListContributor.findUnique({
        where: {
          shoppingListId_userId: {
            shoppingListId: invitation.shoppingListId,
            userId: session.user.id,
          },
        },
      });

      if (existingContributor) {
        // Mettre à jour l'invitation comme acceptée même si déjà contributeur
        await db.invitation.update({
          where: { id: invitationId },
          data: {
            status: InvitationStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        });
        return NextResponse.json(
          { error: "Vous êtes déjà contributeur de cette liste" },
          { status: 400 }
        );
      }

      // Transaction pour accepter l'invitation et créer le contributeur
      await db.$transaction([
        db.invitation.update({
          where: { id: invitationId },
          data: {
            status: InvitationStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        }),
        db.shoppingListContributor.create({
          data: {
            shoppingListId: invitation.shoppingListId,
            userId: session.user.id,
            role: invitation.role as any, // Le type est validé côté envoi
          },
        }),
      ]);

      return NextResponse.json({
        message: "Invitation acceptée avec succès",
        redirectUrl: `/shopping-lists/${invitation.shoppingListId}`,
      });
    }

    if (invitation.type === InvitationType.MEAL_PLAN && invitation.weeklyMealPlanId) {
      // Vérifier que le plan existe toujours
      if (!invitation.weeklyMealPlan) {
        return NextResponse.json(
          { error: "Le planificateur de repas n'existe plus" },
          { status: 404 }
        );
      }

      // Vérifier si l'utilisateur n'est pas déjà contributeur
      const existingContributor = await db.mealPlanContributor.findUnique({
        where: {
          weeklyMealPlanId_userId: {
            weeklyMealPlanId: invitation.weeklyMealPlanId,
            userId: session.user.id,
          },
        },
      });

      if (existingContributor) {
        // Mettre à jour l'invitation comme acceptée même si déjà contributeur
        await db.invitation.update({
          where: { id: invitationId },
          data: {
            status: InvitationStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        });
        return NextResponse.json(
          { error: "Vous êtes déjà contributeur de ce planificateur" },
          { status: 400 }
        );
      }

      // Transaction pour accepter l'invitation et créer le contributeur
      await db.$transaction([
        db.invitation.update({
          where: { id: invitationId },
          data: {
            status: InvitationStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        }),
        db.mealPlanContributor.create({
          data: {
            weeklyMealPlanId: invitation.weeklyMealPlanId,
            userId: session.user.id,
            role: invitation.role, // CONTRIBUTOR ou VIEWER
          },
        }),
      ]);

      return NextResponse.json({
        message: "Invitation acceptée avec succès",
        redirectUrl: `/meal-planner?plan=${invitation.weeklyMealPlanId}`,
      });
    }

    return NextResponse.json(
      { error: "Type d'invitation invalide" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'acceptation de l'invitation" },
      { status: 500 }
    );
  }
}
