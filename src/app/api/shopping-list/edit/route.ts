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

    const { planId, listId, itemId, name } = await req.json();

    if ((!planId && !listId) || !itemId || !name) {
      return NextResponse.json(
        { error: "Paramètres manquants (planId ou listId, itemId et name requis)" },
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
        (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
      );

      if (!isOwner && !isContributor) {
        return NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        );
      }

      // Vérifier que l'item existe
      const existingItem = await db.shoppingListItem.findFirst({
        where: {
          id: parseInt(itemId),
          weeklyMealPlanId: planIdNum,
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: "Item non trouvé" },
          { status: 404 }
        );
      }

      // Mettre à jour l'item
      const updatedItem = await db.shoppingListItem.update({
        where: { id: parseInt(itemId) },
        data: {
          ingredientName: name.trim(),
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

      // Broadcaster le changement à tous les clients connectés
      broadcastToClients(planIdNum, {
        type: "item_edited",
        item: updatedItem,
        userName,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        item: updatedItem,
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
        (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
      );

      if (!isOwner && !isContributor) {
        return NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        );
      }

      // Vérifier que l'item existe
      const existingItem = await db.standaloneShoppingItem.findFirst({
        where: {
          id: parseInt(itemId),
          shoppingListId: listIdNum,
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: "Item non trouvé" },
          { status: 404 }
        );
      }

      // Mettre à jour l'item
      const updatedItem = await db.standaloneShoppingItem.update({
        where: { id: parseInt(itemId) },
        data: {
          name: name.trim(),
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

      // Transformer pour le format attendu par le frontend
      const responseItem = {
        id: updatedItem.id,
        ingredientName: updatedItem.name,
        category: updatedItem.category,
        isChecked: updatedItem.isChecked,
        isManuallyAdded: updatedItem.isManuallyAdded,
        checkedAt: updatedItem.checkedAt,
        checkedByUserId: updatedItem.checkedByUserId,
        checkedByUser: updatedItem.checkedByUser,
      };

      // Broadcaster le changement à tous les clients connectés
      broadcastToClients(listIdNum, {
        type: "item_edited",
        item: responseItem,
        userName,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        item: responseItem,
        userName,
      });
    }

    return NextResponse.json(
      { error: "planId ou listId requis" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erreur edit item:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
