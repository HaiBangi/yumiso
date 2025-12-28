import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const body = await request.json();
    const { isFavorite } = body;

    // Vérifier que l'utilisateur a accès à cette liste
    const list = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        OR: [
          { userId: session.user.id },
          { contributors: { some: { userId: session.user.id } } },
          { weeklyMealPlan: { contributors: { some: { userId: session.user.id } } } },
        ],
        deletedAt: null,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }

    // Seul le propriétaire peut modifier les favoris
    if (list.userId !== session.user.id) {
      return NextResponse.json({ error: "Seul le propriétaire peut modifier les favoris" }, { status: 403 });
    }

    // Mettre à jour le favori
    const updatedList = await db.shoppingList.update({
      where: { id: listIdNum },
      data: { isFavorite: Boolean(isFavorite) },
    });

    return NextResponse.json({ 
      success: true, 
      isFavorite: updatedList.isFavorite 
    });
  } catch (error) {
    console.error("Erreur toggle favorite:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
