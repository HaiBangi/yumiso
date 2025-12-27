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

    // Supprimer l'item
    const deletedItem = await db.shoppingListItem.deleteMany({
      where: {
        weeklyMealPlanId: planIdNum,
        ingredientName: ingredientName.trim(),
        category: category,
      },
    });

    if (deletedItem.count === 0) {
      return NextResponse.json(
        { error: "Article non trouvé" },
        { status: 404 }
      );
    }

    const userName = session.user.pseudo || session.user.name || "Anonyme";

    // Broadcaster la suppression à tous les clients connectés
    console.log(`[SSE] Broadcasting item removal to plan ${planIdNum}:`, {
      type: "item_removed",
      ingredientName,
      category,
      userName,
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
    });
  } catch (error) {
    console.error("Error removing item:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
