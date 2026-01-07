import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { broadcastToClients } from "@/lib/sse-clients";

// POST /api/shopping-list/move-store-batch - Déplacer plusieurs items vers une enseigne en une seule requête
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { itemIds, newStoreId } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "itemIds (array) requis" },
        { status: 400 }
      );
    }

    console.log(`[API move-store-batch] Déplacement de ${itemIds.length} items vers store ${newStoreId || 'null'}`);

    const userName = session.user.pseudo || session.user.name || "Anonyme";

    // Récupérer tous les items à déplacer pour vérifier les droits
    const [planItems, standaloneItems] = await Promise.all([
      db.shoppingListItem.findMany({
        where: { id: { in: itemIds } },
        include: { weeklyMealPlan: { include: { contributors: true } } },
      }),
      db.standaloneShoppingItem.findMany({
        where: { id: { in: itemIds } },
        include: { shoppingList: { include: { contributors: true } } },
      }),
    ]);

    console.log(`[API move-store-batch] Trouvé: ${planItems.length} plan items, ${standaloneItems.length} standalone items`);

    // Vérifier les droits pour chaque item
    const allowedPlanItemIds: number[] = [];
    const allowedStandaloneItemIds: number[] = [];

    planItems.forEach(item => {
      const isOwner = item.weeklyMealPlan.userId === session.user.id;
      const isContributor = item.weeklyMealPlan.contributors.some(
        c => c.userId === session.user.id && c.role !== "VIEWER"
      );

      if (isOwner || isContributor) {
        allowedPlanItemIds.push(item.id);
      }
    });

    standaloneItems.forEach(item => {
      const isOwner = item.shoppingList.userId === session.user.id;
      const isContributor = item.shoppingList.contributors.some(
        c => c.userId === session.user.id && c.role !== "VIEWER"
      );

      if (isOwner || isContributor) {
        allowedStandaloneItemIds.push(item.id);
      }
    });

    console.log(`[API move-store-batch] Autorisés: ${allowedPlanItemIds.length} plan items, ${allowedStandaloneItemIds.length} standalone items`);

    // Déplacer les items en batch
    const [updatedPlanItems, updatedStandaloneItems] = await Promise.all([
      allowedPlanItemIds.length > 0
        ? db.shoppingListItem.updateMany({
            where: { id: { in: allowedPlanItemIds } },
            data: { storeId: newStoreId || null },
          })
        : Promise.resolve({ count: 0 }),
      allowedStandaloneItemIds.length > 0
        ? db.standaloneShoppingItem.updateMany({
            where: { id: { in: allowedStandaloneItemIds } },
            data: { storeId: newStoreId || null },
          })
        : Promise.resolve({ count: 0 }),
    ]);

    console.log(`[API move-store-batch] Déplacés: ${updatedPlanItems.count} plan items, ${updatedStandaloneItems.count} standalone items`);

    // Récupérer les items mis à jour avec leurs stores pour broadcaster
    const [updatedPlanItemsData, updatedStandaloneItemsData] = await Promise.all([
      allowedPlanItemIds.length > 0
        ? db.shoppingListItem.findMany({
            where: { id: { in: allowedPlanItemIds } },
            include: {
              storeRelation: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                  color: true,
                  isGlobal: true,
                  userId: true,
                },
              },
            },
          })
        : [],
      allowedStandaloneItemIds.length > 0
        ? db.standaloneShoppingItem.findMany({
            where: { id: { in: allowedStandaloneItemIds } },
            include: {
              storeRelation: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                  color: true,
                  isGlobal: true,
                  userId: true,
                },
              },
            },
          })
        : [],
    ]);

    // Broadcaster les événements SSE groupés par planId/listId
    const planItemsByPlan = new Map<number, any[]>();
    updatedPlanItemsData.forEach(item => {
      if (!planItemsByPlan.has(item.weeklyMealPlanId)) {
        planItemsByPlan.set(item.weeklyMealPlanId, []);
      }
      planItemsByPlan.get(item.weeklyMealPlanId)!.push(item);
    });

    planItemsByPlan.forEach((items, planId) => {
      items.forEach(item => {
        broadcastToClients(planId, {
          type: "item_moved_store",
          item: {
            ...item,
            store: item.storeRelation,
            storeRelation: undefined,
          },
          newStore: item.storeRelation?.name || null,
          userName,
          userId: session.user.id,
          timestamp: new Date().toISOString(),
        });
      });
    });

    const standaloneItemsByList = new Map<number, any[]>();
    updatedStandaloneItemsData.forEach(item => {
      if (!standaloneItemsByList.has(item.shoppingListId)) {
        standaloneItemsByList.set(item.shoppingListId, []);
      }
      standaloneItemsByList.get(item.shoppingListId)!.push(item);
    });

    standaloneItemsByList.forEach((items, listId) => {
      items.forEach(item => {
        broadcastToClients(listId, {
          type: "item_moved_store",
          item: {
            id: item.id,
            ingredientName: item.name,
            category: item.category,
            storeId: item.storeId,
            store: item.storeRelation,
            isChecked: item.isChecked,
            isManuallyAdded: item.isManuallyAdded,
            checkedAt: item.checkedAt,
            checkedByUserId: item.checkedByUserId,
          },
          newStore: item.storeRelation?.name || null,
          userName,
          userId: session.user.id,
          timestamp: new Date().toISOString(),
        });
      });
    });

    const totalMoved = updatedPlanItems.count + updatedStandaloneItems.count;
    console.log(`[API move-store-batch] ✅ Total déplacé: ${totalMoved}`);

    return NextResponse.json({
      success: true,
      movedCount: totalMoved,
      planItems: updatedPlanItems.count,
      standaloneItems: updatedStandaloneItems.count,
    });
  } catch (error) {
    console.error("[API move-store-batch] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du déplacement des items" },
      { status: 500 }
    );
  }
}
