import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Ajouter un item à la liste
export async function POST(
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
    const { name, quantity, category } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom de l'article est requis" },
        { status: 400 }
      );
    }

    // Récupérer l'ordre max actuel pour cette catégorie
    const maxOrder = await db.standaloneShoppingItem.findFirst({
      where: { shoppingListId: listIdNum, category: category || "Autres" },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const item = await db.standaloneShoppingItem.create({
      data: {
        name: name.trim(),
        quantity: quantity?.trim() || null,
        category: category || "Autres",
        order: (maxOrder?.order ?? -1) + 1,
        shoppingListId: listIdNum,
      },
      include: {
        checkedByUser: { select: { id: true, pseudo: true, name: true } }
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    // Gérer le cas où l'item existe déjà - simplement l'ignorer car il est déjà présent
    if (error && typeof error === 'object' && 'code' in error && error.code === "P2002") {
      console.log("[Add Item] Item déjà existant, ignoré silencieusement");
      // Retourner un succès même si l'item existe déjà
      return NextResponse.json({ success: true, message: "Item déjà présent" }, { status: 200 });
    }
    console.error("Erreur POST /api/shopping-lists/[listId]/items:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout de l'article" },
      { status: 500 }
    );
  }
}
