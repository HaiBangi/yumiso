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

    const { planId, ingredientName, fromCategory, toCategory } = await req.json();

    if (!planId || !ingredientName || !fromCategory || !toCategory) {
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

    // Mettre à jour la catégorie de l'item (en préservant isManuallyAdded et autres champs)
    const updatedItem = await db.shoppingListItem.updateMany({
      where: {
        weeklyMealPlanId: planIdNum,
        ingredientName: ingredientName.trim(),
        category: fromCategory,
      },
      data: {
        category: toCategory,
      },
    });

    if (updatedItem.count === 0) {
      return NextResponse.json(
        { error: "Article non trouvé" },
        { status: 404 }
      );
    }

    // Récupérer l'item mis à jour
    const item = await db.shoppingListItem.findFirst({
      where: {
        weeklyMealPlanId: planIdNum,
        ingredientName: ingredientName.trim(),
        category: toCategory,
      },
      include: {
        checkedByUser: {
          select: {
            id: true,
            pseudo: true,
            name: true,
          },
        },
      },
    });

    const userName = session.user.pseudo || session.user.name || "Anonyme";

    // Broadcaster le changement de catégorie à tous les clients connectés
    console.log(`[SSE] Broadcasting category change to plan ${planIdNum}:`, {
      type: "item_moved",
      ingredientName,
      fromCategory,
      toCategory,
      userName,
    });
    
    broadcastToClients(planIdNum, {
      type: "item_moved",
      item,
      fromCategory,
      toCategory,
      userName,
      userId: session.user.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      item,
      userName,
    });
  } catch (error) {
    console.error("Error moving item:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
