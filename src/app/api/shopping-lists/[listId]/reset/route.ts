import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { broadcastToClients } from "@/lib/sse-clients";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { listId } = await params;
    const listIdNum = parseInt(listId, 10);

    if (isNaN(listIdNum)) {
      return NextResponse.json(
        { error: "ID de liste invalide" },
        { status: 400 }
      );
    }

    // Vérifier que la liste existe et que l'utilisateur a accès
    const list = await db.shoppingList.findUnique({
      where: { id: listIdNum },
      include: { contributors: true },
    });

    if (!list) {
      return NextResponse.json(
        { error: "Liste non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier que la liste n'est PAS liée à un menu (liste perso uniquement)
    if (list.weeklyMealPlanId) {
      return NextResponse.json(
        { error: "Cette fonctionnalité n'est disponible que pour les listes personnalisées" },
        { status: 400 }
      );
    }

    // Vérifier les droits d'accès
    const isOwner = list.userId === session.user.id;
    const isContributor = list.contributors.some(
      (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
    );

    if (!isOwner && !isContributor) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Supprimer tous les items de la liste
    const deleteResult = await db.standaloneShoppingItem.deleteMany({
      where: { shoppingListId: listIdNum },
    });

    const userName = session.user.pseudo || session.user.name || "Anonyme";

    // Broadcaster l'événement de réinitialisation
    broadcastToClients(listIdNum, {
      type: "list_reset",
      userName,
      userId: session.user.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      message: `${deleteResult.count} article(s) supprimé(s)`,
    });
  } catch (error) {
    console.error("Error resetting shopping list:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation" },
      { status: 500 }
    );
  }
}
