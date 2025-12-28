import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH - Mettre à jour un item (toggle, éditer, déplacer)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listId: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listId, itemId } = await params;
    const listIdNum = parseInt(listId);
    const itemIdNum = parseInt(itemId);

    if (isNaN(listIdNum) || isNaN(itemIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier les droits
    const list = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        OR: [
          { userId: session.user.id },
          { contributors: { some: { userId: session.user.id, role: { not: "VIEWER" } } } }
        ],
        deletedAt: null,
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "Liste non trouvée ou accès refusé" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, quantity, category, isChecked, order } = body;

    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (quantity !== undefined) updateData.quantity = quantity?.trim() || null;
    if (category !== undefined) updateData.category = category;
    if (order !== undefined) updateData.order = order;
    
    if (isChecked !== undefined) {
      updateData.isChecked = isChecked;
      updateData.checkedAt = isChecked ? new Date() : null;
      updateData.checkedByUserId = isChecked ? session.user.id : null;
    }

    const item = await db.standaloneShoppingItem.update({
      where: { 
        id: itemIdNum,
        shoppingListId: listIdNum,
      },
      data: updateData,
      include: {
        checkedByUser: { select: { id: true, pseudo: true, name: true } }
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Erreur PATCH /api/shopping-lists/[listId]/items/[itemId]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'article" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listId: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listId, itemId } = await params;
    const listIdNum = parseInt(listId);
    const itemIdNum = parseInt(itemId);

    if (isNaN(listIdNum) || isNaN(itemIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier les droits
    const list = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        OR: [
          { userId: session.user.id },
          { contributors: { some: { userId: session.user.id, role: { not: "VIEWER" } } } }
        ],
        deletedAt: null,
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "Liste non trouvée ou accès refusé" },
        { status: 404 }
      );
    }

    await db.standaloneShoppingItem.delete({
      where: { 
        id: itemIdNum,
        shoppingListId: listIdNum,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/shopping-lists/[listId]/items/[itemId]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'article" },
      { status: 500 }
    );
  }
}
