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

    const { planId, listId } = await req.json();

    if (!planId && !listId) {
      return NextResponse.json(
        { error: "Paramètres manquants (planId ou listId requis)" },
        { status: 400 }
      );
    }

    const userName = session.user.pseudo || session.user.name || "Anonyme";

    // ========== CAS 1: Liste liée à un menu (planId) ==========
    if (planId) {
      const planIdNum = typeof planId === 'number' ? planId : parseInt(planId);
      console.log('[clear-checked] planIdNum parsé:', planIdNum);

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

      // Supprimer tous les items cochés
      const deleteResult = await db.shoppingListItem.deleteMany({
        where: {
          weeklyMealPlanId: planIdNum,
          isChecked: true,
        },
      });

      // Broadcaster le changement à tous les clients connectés
      broadcastToClients(planIdNum, {
        type: "checked_items_cleared",
        deletedCount: deleteResult.count,
        userName,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        deletedCount: deleteResult.count,
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

      // Supprimer tous les items cochés
      const deleteResult = await db.standaloneShoppingItem.deleteMany({
        where: {
          shoppingListId: listIdNum,
          isChecked: true,
        },
      });

      // Broadcaster le changement à tous les clients connectés
      broadcastToClients(listIdNum, {
        type: "checked_items_cleared",
        deletedCount: deleteResult.count,
        userName,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        deletedCount: deleteResult.count,
        userName,
      });
    }

    return NextResponse.json(
      { error: "planId ou listId requis" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erreur clear checked items:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
