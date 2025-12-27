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

    if (!planId || !ingredientName) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    const planIdNum = parseInt(planId);
    const itemCategory = category || "Autres";

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

    // Vérifier si l'item existe déjà
    const existingItem = await db.shoppingListItem.findFirst({
      where: {
        weeklyMealPlanId: planIdNum,
        ingredientName: ingredientName.trim(),
        category: itemCategory,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "Cet article existe déjà dans la liste" },
        { status: 409 }
      );
    }

    // Créer le nouvel item
    const shoppingListItem = await db.shoppingListItem.create({
      data: {
        weeklyMealPlanId: planIdNum,
        ingredientName: ingredientName.trim(),
        category: itemCategory,
        isChecked: false,
        isManuallyAdded: true, // Marqué comme ajouté manuellement
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

    // Broadcaster l'ajout à tous les clients connectés
    broadcastToClients(planIdNum, {
      type: "item_added",
      item: shoppingListItem,
      userName,
      userId: session.user.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      item: shoppingListItem,
      userName,
    });
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
