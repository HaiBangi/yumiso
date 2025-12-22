import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Liste des contributeurs d'un menu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier que l'utilisateur a accès au plan
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      select: { userId: true, isPublic: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 });
    }

    // Seul le propriétaire peut voir la liste des contributeurs
    if (plan.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Récupérer les contributeurs
    const contributors = await db.mealPlanContributor.findMany({
      where: { weeklyMealPlanId: planId },
      include: {
        user: {
          select: {
            id: true,
            pseudo: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    return NextResponse.json(contributors);
  } catch (error) {
    console.error("Erreur lors de la récupération des contributeurs:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Ajouter un contributeur
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body = await request.json();
    const { userEmail, userId, userPseudo, role } = body;

    // Validation : on doit avoir soit un email, soit un userId/pseudo
    if (!userEmail && !userId && !userPseudo) {
      return NextResponse.json(
        { error: "Email, ID utilisateur ou pseudo requis" },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: "Rôle requis" },
        { status: 400 }
      );
    }

    if (role !== "CONTRIBUTOR" && role !== "VIEWER") {
      return NextResponse.json(
        { error: "Rôle invalide (CONTRIBUTOR ou VIEWER)" },
        { status: 400 }
      );
    }

    // Vérifier que le plan appartient à l'utilisateur
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      select: { userId: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 });
    }

    if (plan.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Seul le propriétaire peut ajouter des contributeurs" },
        { status: 403 }
      );
    }

    // Trouver l'utilisateur (par userId, email ou pseudo)
    let targetUser;
    
    if (userId) {
      // Recherche par ID
      targetUser = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, pseudo: true, email: true, image: true },
      });
    } else if (userEmail) {
      // Recherche par email exact
      targetUser = await db.user.findUnique({
        where: { email: userEmail },
        select: { id: true, pseudo: true, email: true, image: true },
      });
    } else if (userPseudo) {
      // Recherche par pseudo (insensible à la casse)
      targetUser = await db.user.findFirst({
        where: {
          pseudo: {
            equals: userPseudo,
            mode: "insensitive",
          },
        },
        select: { id: true, pseudo: true, email: true, image: true },
      });
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Ne pas ajouter le propriétaire comme contributeur
    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "Vous êtes déjà le propriétaire" },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur n'est pas déjà contributeur
    const existing = await db.mealPlanContributor.findUnique({
      where: {
        weeklyMealPlanId_userId: {
          weeklyMealPlanId: planId,
          userId: targetUser.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Cet utilisateur est déjà contributeur" },
        { status: 400 }
      );
    }

    // Ajouter le contributeur
    const contributor = await db.mealPlanContributor.create({
      data: {
        weeklyMealPlanId: planId,
        userId: targetUser.id,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            pseudo: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(contributor);
  } catch (error) {
    console.error("Erreur lors de l'ajout du contributeur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Retirer un contributeur
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const contributorUserId = searchParams.get("userId");

    if (!contributorUserId) {
      return NextResponse.json(
        { error: "ID utilisateur requis" },
        { status: 400 }
      );
    }

    // Vérifier que le plan appartient à l'utilisateur
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      select: { userId: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 });
    }

    if (plan.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Seul le propriétaire peut retirer des contributeurs" },
        { status: 403 }
      );
    }

    // Supprimer le contributeur
    await db.mealPlanContributor.delete({
      where: {
        weeklyMealPlanId_userId: {
          weeklyMealPlanId: planId,
          userId: contributorUserId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression du contributeur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PATCH - Modifier le rôle d'un contributeur
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "ID utilisateur et rôle requis" },
        { status: 400 }
      );
    }

    if (role !== "CONTRIBUTOR" && role !== "VIEWER") {
      return NextResponse.json(
        { error: "Rôle invalide (CONTRIBUTOR ou VIEWER)" },
        { status: 400 }
      );
    }

    // Vérifier que le plan appartient à l'utilisateur
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      select: { userId: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 });
    }

    if (plan.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Seul le propriétaire peut modifier les rôles" },
        { status: 403 }
      );
    }

    // Mettre à jour le rôle
    await db.mealPlanContributor.update({
      where: {
        weeklyMealPlanId_userId: {
          weeklyMealPlanId: planId,
          userId,
        },
      },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la modification du rôle:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
