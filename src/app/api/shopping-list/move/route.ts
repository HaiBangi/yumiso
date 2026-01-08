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

    const { planId, listId, ingredientName, fromCategory, toCategory } = await req.json();

    if ((!planId && !listId) || !ingredientName || !fromCategory || !toCategory) {
      return NextResponse.json(
        { error: "Paramètres manquants (planId ou listId requis)" },
        { status: 400 }
      );
    }

    const userName = session.user.pseudo || session.user.name || "Anonyme";

    // ========== CAS 1: Liste liée à un menu (planId) ==========
    if (planId) {
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
        (c) => c.userId === session.user.id // Tous les rôles acceptés
      );

      if (!isOwner && !isContributor) {
        return NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        );
      }

      // Trouver l'item existant pour conserver ses propriétés
      const existingItem = await db.shoppingListItem.findFirst({
        where: {
          weeklyMealPlanId: planIdNum,
          ingredientName: ingredientName.trim(),
          category: fromCategory,
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: "Article non trouvé" },
          { status: 404 }
        );
      }

      // Mettre à jour la catégorie de l'item (préserve l'ID et isManuallyAdded)
      const item = await db.shoppingListItem.update({
        where: { id: existingItem.id },
        data: {
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

      // Broadcaster le changement de catégorie
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
    }

    // ========== CAS 2: Liste indépendante (listId) ==========
    if (listId) {
      const listIdNum = parseInt(listId);

      // Vérifier que l'utilisateur a accès à la liste
      const list = await db.shoppingList.findUnique({
        where: { id: listIdNum },
        include: {
          contributors: true,
        },
      });

      if (!list) {
        return NextResponse.json(
          { error: "Liste non trouvée" },
          { status: 404 }
        );
      }

      // Vérifier les permissions (owner ou contributor)
      const isOwner = list.userId === session.user.id;
      const isContributor = list.contributors.some(
        (c) => c.userId === session.user.id // Tous les rôles acceptés
      );

      if (!isOwner && !isContributor) {
        return NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        );
      }

      // Trouver l'item existant pour conserver ses propriétés (notamment isManuallyAdded)
      const existingItem = await db.standaloneShoppingItem.findFirst({
        where: {
          shoppingListId: listIdNum,
          name: ingredientName.trim(),
          category: fromCategory,
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: "Article non trouvé" },
          { status: 404 }
        );
      }

      // Mettre à jour la catégorie de l'item (préserve l'ID et isManuallyAdded)
      const standaloneItem = await db.standaloneShoppingItem.update({
        where: { id: existingItem.id },
        data: {
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
          storeRelation: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              color: true,
            },
          },
        },
      });

      // Mapper vers le format standard (préserver isManuallyAdded depuis la DB)
      const item = {
        id: standaloneItem.id,
        ingredientName: standaloneItem.name,
        category: standaloneItem.category,
        storeId: standaloneItem.storeId,
        store: standaloneItem.storeRelation,
        isChecked: standaloneItem.isChecked,
        isManuallyAdded: standaloneItem.isManuallyAdded,
        checkedAt: standaloneItem.checkedAt,
        checkedByUserId: standaloneItem.checkedByUserId,
        checkedByUser: standaloneItem.checkedByUser,
      };

      // Broadcaster le changement de catégorie
      broadcastToClients(listIdNum, {
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
    }

    return NextResponse.json(
      { error: "Paramètres invalides" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error moving item:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
