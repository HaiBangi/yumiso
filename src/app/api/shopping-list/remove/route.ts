import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { broadcastToClients } from "@/lib/sse-clients";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { planId, ingredientName, category } = await req.json();

    if (!planId || !ingredientName || !category) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    const planIdNum = parseInt(planId);

    // Vérifier que l'utilisateur a accès au plan
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planIdNum },
      include: {
        contributors: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier les permissions (owner ou contributor)
    const isOwner = plan.userId === session.user.id;
    const isContributor = plan.contributors.some(
      (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
    );

    if (!isOwner && !isContributor) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Supprimer l'item de la base (s'il existe)
    const deletedItem = await db.shoppingListItem.deleteMany({
      where: {
        weeklyMealPlanId: planIdNum,
        ingredientName: ingredientName.trim(),
        category: category,
      },
    });

    const userName = session.user.pseudo || session.user.name || "Anonyme";

    // Broadcaster la suppression à tous les clients connectés
    // (même si l'item n'était pas en base - pour les articles des recettes)
    console.log(`[SSE] Broadcasting item removal to plan ${planIdNum}:`, {
      type: "item_removed",
      ingredientName,
      category,
      userName,
      wasInDatabase: deletedItem.count > 0,
    });
    
    broadcastToClients(planIdNum, {
      type: "item_removed",
      ingredientName,
      category,
      userName,
      userId: session.user.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      userName,
      wasInDatabase: deletedItem.count > 0,
    });
  } catch (error) {
    console.error("Error removing item:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
