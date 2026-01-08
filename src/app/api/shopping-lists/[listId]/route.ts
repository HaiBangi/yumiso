import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Récupérer une liste de courses spécifique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listId } = await params;
    const listIdNum = parseInt(listId);

    if (isNaN(listIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Récupérer la liste avec toutes les relations nécessaires
    const list = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        deletedAt: null,
        OR: [
          // Propriétaire de la liste
          { userId: session.user.id },
          // Contributeur direct de la liste
          { contributors: { some: { userId: session.user.id } } },
          // Propriétaire du WeeklyMealPlan lié
          { weeklyMealPlan: { userId: session.user.id } },
          // Contributeur du WeeklyMealPlan lié
          { weeklyMealPlan: { contributors: { some: { userId: session.user.id } } } },
          // Liste publique
          { isPublic: true }
        ],
      },
      include: {
        user: { select: { id: true, pseudo: true, name: true, image: true } },
        weeklyMealPlan: { 
          select: { 
            id: true, 
            name: true,
            userId: true,
            meals: {
              select: {
                id: true,
                name: true,
                ingredients: true,
              }
            },
            contributors: {
              select: {
                userId: true,
                role: true,
              }
            }
          } 
        },
        items: {
          orderBy: [{ category: "asc" }, { order: "asc" }, { name: "asc" }],
          include: {
            checkedByUser: { select: { id: true, pseudo: true, name: true } }
          }
        },
        contributors: {
          include: {
            user: { select: { id: true, pseudo: true, name: true, image: true } }
          }
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }

    // Déterminer les permissions de l'utilisateur
    const isOwner = list.userId === session.user.id;
    const listContributor = list.contributors.find(c => c.userId === session.user.id);
    const isListContributor = !!listContributor;
    const userRole = listContributor?.role || null;
    const isMealPlanOwner = list.weeklyMealPlan?.userId === session.user.id;
    const isMealPlanContributor = list.weeklyMealPlan?.contributors?.some(
      c => c.userId === session.user.id
    ) || false;

    // Peut éditer si: propriétaire, contributeur de la liste (non viewer),
    // propriétaire du menu, ou contributeur du menu (non viewer)
    const canEdit = isOwner ||
                   isListContributor ||
                   isMealPlanOwner ||
                   (isMealPlanContributor && list.weeklyMealPlan?.contributors?.some(
                     c => c.userId === session.user.id && c.role !== "VIEWER"
                   ));

    // Peut gérer les contributeurs si: propriétaire ou admin
    const canManageContributors = isOwner || userRole === "ADMIN";

    return NextResponse.json({
      ...list,
      isOwner,
      canEdit,
      userRole,
      canManageContributors,
    });
  } catch (error) {
    console.error("Erreur GET /api/shopping-lists/[listId]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la liste" },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour une liste de courses
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listId } = await params;
    const listIdNum = parseInt(listId);

    if (isNaN(listIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier les droits
    const existingList = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        OR: [
          { userId: session.user.id },
          { contributors: { some: { userId: session.user.id, role: { not: "VIEWER" } } } }
        ],
        deletedAt: null,
      },
    });

    if (!existingList) {
      return NextResponse.json(
        { error: "Liste non trouvée ou accès refusé" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, color, icon, isPublic } = body;

    const updatedList = await db.shoppingList.update({
      where: { id: listIdNum },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(isPublic !== undefined && { isPublic }),
      },
      include: {
        items: true,
        user: { select: { id: true, pseudo: true, name: true } },
      }
    });

    return NextResponse.json(updatedList);
  } catch (error) {
    console.error("Erreur PATCH /api/shopping-lists/[listId]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la liste" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une liste de courses (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listId } = await params;
    const listIdNum = parseInt(listId);

    if (isNaN(listIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Seul le propriétaire peut supprimer
    const existingList = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!existingList) {
      return NextResponse.json(
        { error: "Liste non trouvée ou vous n'êtes pas le propriétaire" },
        { status: 404 }
      );
    }

    // Soft delete
    await db.shoppingList.update({
      where: { id: listIdNum },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/shopping-lists/[listId]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la liste" },
      { status: 500 }
    );
  }
}
