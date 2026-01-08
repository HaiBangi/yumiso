import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-security";
import { db } from "@/lib/db";
import { InvitationStatus, InvitationType } from "@prisma/client";

/**
 * GET /api/invitations
 * Récupère les invitations reçues par l'utilisateur connecté
 * Query params:
 * - status: PENDING | ACCEPTED | REJECTED | CANCELLED | EXPIRED (optionnel, par défaut: PENDING)
 * - type: SHOPPING_LIST | MEAL_PLAN (optionnel)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status") as InvitationStatus | null;
  const type = searchParams.get("type") as InvitationType | null;

  try {
    const invitations = await db.invitation.findMany({
      where: {
        inviteeId: session.user.id,
        ...(status && { status }),
        ...(type && { type }),
      },
      include: {
        inviter: {
          select: {
            id: true,
            pseudo: true,
            email: true,
            image: true,
          },
        },
        shoppingList: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        weeklyMealPlan: {
          select: {
            id: true,
            name: true,
            weekStart: true,
            weekEnd: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des invitations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations
 * Crée une nouvelle invitation
 * Body:
 * - type: SHOPPING_LIST | MEAL_PLAN
 * - role: string (VIEWER, EDITOR, ADMIN, CONTRIBUTOR)
 * - inviteeId?: string (ou email/pseudo)
 * - email?: string
 * - pseudo?: string
 * - shoppingListId?: number
 * - weeklyMealPlanId?: number
 * - message?: string
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;

  try {
    const body = await request.json();
    const {
      type,
      role,
      inviteeId,
      email,
      pseudo,
      shoppingListId,
      weeklyMealPlanId,
      message,
    } = body;

    // Validation
    if (!type || !role) {
      return NextResponse.json(
        { error: "Type et rôle requis" },
        { status: 400 }
      );
    }

    if (!inviteeId && !email && !pseudo) {
      return NextResponse.json(
        { error: "Un identifiant d'utilisateur est requis (ID, email ou pseudo)" },
        { status: 400 }
      );
    }

    if (type === InvitationType.SHOPPING_LIST && !shoppingListId) {
      return NextResponse.json(
        { error: "ID de liste de courses requis pour ce type d'invitation" },
        { status: 400 }
      );
    }

    if (type === InvitationType.MEAL_PLAN && !weeklyMealPlanId) {
      return NextResponse.json(
        { error: "ID de planificateur de repas requis pour ce type d'invitation" },
        { status: 400 }
      );
    }

    // Rechercher l'utilisateur invité
    let targetUser;
    if (inviteeId) {
      targetUser = await db.user.findUnique({ where: { id: inviteeId } });
    } else if (email) {
      targetUser = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    } else if (pseudo) {
      targetUser = await db.user.findFirst({
        where: { pseudo: { equals: pseudo, mode: "insensitive" } },
      });
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Ne pas s'inviter soi-même
    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous inviter vous-même" },
        { status: 400 }
      );
    }

    // Vérifier les permissions selon le type
    if (type === InvitationType.SHOPPING_LIST && shoppingListId) {
      const shoppingList = await db.shoppingList.findUnique({
        where: { id: shoppingListId },
        include: {
          contributors: true,
        },
      });

      if (!shoppingList) {
        return NextResponse.json(
          { error: "Liste de courses introuvable" },
          { status: 404 }
        );
      }

      // Vérifier que l'utilisateur est propriétaire
      if (shoppingList.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Seul le propriétaire peut inviter des contributeurs" },
          { status: 403 }
        );
      }

      // Vérifier si l'utilisateur est déjà contributeur
      const isAlreadyContributor = shoppingList.contributors.some(
        (c) => c.userId === targetUser.id
      );
      if (isAlreadyContributor) {
        return NextResponse.json(
          { error: "Cet utilisateur est déjà contributeur de cette liste" },
          { status: 400 }
        );
      }

      // Vérifier s'il y a déjà une invitation en attente
      const existingInvitation = await db.invitation.findFirst({
        where: {
          inviteeId: targetUser.id,
          shoppingListId,
          status: InvitationStatus.PENDING,
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: "Une invitation est déjà en attente pour cet utilisateur" },
          { status: 400 }
        );
      }
    }

    if (type === InvitationType.MEAL_PLAN && weeklyMealPlanId) {
      const mealPlan = await db.weeklyMealPlan.findUnique({
        where: { id: weeklyMealPlanId },
        include: {
          contributors: true,
        },
      });

      if (!mealPlan) {
        return NextResponse.json(
          { error: "Planificateur de repas introuvable" },
          { status: 404 }
        );
      }

      // Vérifier que l'utilisateur est propriétaire
      if (mealPlan.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Seul le propriétaire peut inviter des contributeurs" },
          { status: 403 }
        );
      }

      // Vérifier si l'utilisateur est déjà contributeur
      const isAlreadyContributor = mealPlan.contributors.some(
        (c) => c.userId === targetUser.id
      );
      if (isAlreadyContributor) {
        return NextResponse.json(
          { error: "Cet utilisateur est déjà contributeur de ce planificateur" },
          { status: 400 }
        );
      }

      // Vérifier s'il y a déjà une invitation en attente
      const existingInvitation = await db.invitation.findFirst({
        where: {
          inviteeId: targetUser.id,
          weeklyMealPlanId,
          status: InvitationStatus.PENDING,
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: "Une invitation est déjà en attente pour cet utilisateur" },
          { status: 400 }
        );
      }
    }

    // Créer l'invitation
    const invitation = await db.invitation.create({
      data: {
        type,
        role,
        inviterId: session.user.id,
        inviteeId: targetUser.id,
        shoppingListId: type === InvitationType.SHOPPING_LIST ? shoppingListId : null,
        weeklyMealPlanId: type === InvitationType.MEAL_PLAN ? weeklyMealPlanId : null,
        message,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      },
      include: {
        inviter: {
          select: {
            id: true,
            pseudo: true,
            email: true,
            image: true,
          },
        },
        invitee: {
          select: {
            id: true,
            pseudo: true,
            email: true,
            image: true,
          },
        },
        shoppingList: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        weeklyMealPlan: {
          select: {
            id: true,
            name: true,
            weekStart: true,
            weekEnd: true,
          },
        },
      },
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'invitation" },
      { status: 500 }
    );
  }
}
