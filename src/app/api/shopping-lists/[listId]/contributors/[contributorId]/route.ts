import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE - Supprimer un contributeur d'une liste
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listId: string; contributorId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listId, contributorId } = await params;
    const listIdNum = parseInt(listId);
    const contributorIdNum = parseInt(contributorId);

    if (isNaN(listIdNum) || isNaN(contributorIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier que l'utilisateur est propriétaire OU admin de la liste
    const list = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        deletedAt: null,
        OR: [
          { userId: session.user.id }, // Propriétaire
          { contributors: { some: { userId: session.user.id, role: "ADMIN" } } } // Admin
        ]
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Liste non trouvée ou accès refusé" }, { status: 404 });
    }

    // Vérifier que le contributeur existe
    const contributor = await db.shoppingListContributor.findFirst({
      where: {
        id: contributorIdNum,
        shoppingListId: listIdNum,
      }
    });

    if (!contributor) {
      return NextResponse.json({ error: "Contributeur non trouvé" }, { status: 404 });
    }

    // Supprimer le contributeur
    await db.shoppingListContributor.delete({
      where: { id: contributorIdNum }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/shopping-lists/[listId]/contributors/[contributorId]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du contributeur" },
      { status: 500 }
    );
  }
}

// PATCH - Modifier le rôle d'un contributeur
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listId: string; contributorId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listId, contributorId } = await params;
    const listIdNum = parseInt(listId);
    const contributorIdNum = parseInt(contributorId);

    if (isNaN(listIdNum) || isNaN(contributorIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !["VIEWER", "EDITOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }

    // Vérifier que l'utilisateur est propriétaire OU admin de la liste
    const list = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        deletedAt: null,
        OR: [
          { userId: session.user.id }, // Propriétaire
          { contributors: { some: { userId: session.user.id, role: "ADMIN" } } } // Admin
        ]
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Liste non trouvée ou accès refusé" }, { status: 404 });
    }

    // Mettre à jour le rôle du contributeur
    const updatedContributor = await db.shoppingListContributor.update({
      where: { id: contributorIdNum },
      data: { role },
      include: {
        user: { select: { id: true, pseudo: true, name: true, image: true, email: true } }
      }
    });

    return NextResponse.json(updatedContributor);
  } catch (error) {
    console.error("Erreur PATCH /api/shopping-lists/[listId]/contributors/[contributorId]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du rôle" },
      { status: 500 }
    );
  }
}
