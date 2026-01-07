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

    const body = await req.json();
    const { planId, listId, itemId, storeId, category } = body;

    if (!planId && !listId) {
      return NextResponse.json(
        { error: "Paramètres manquants (planId ou listId requis)" },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId requis" },
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
        include: { contributors: true },
      });

      if (!plan) {
        return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
      }

      const isOwner = plan.userId === session.user.id;
      const isContributor = plan.contributors.some(
        (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
      );

      if (!isOwner && !isContributor) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }

      // Mettre à jour l'item (storeId et catégorie si fournie)
      const updateData: { storeId: number | null; category?: string } = { storeId: storeId || null };
      if (category) {
        updateData.category = category;
      }

      const item = await db.shoppingListItem.update({
        where: { id: itemId },
        data: updateData,
        include: {
          checkedByUser: {
            select: { id: true, pseudo: true, name: true },
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

      // Broadcaster le changement
      console.log('[move-store] 📡 Broadcasting pour planId:', planIdNum, 'newStore:', item.storeRelation?.name || null);
      broadcastToClients(planIdNum, {
        type: "item_moved_store",
        item: {
          id: item.id,
          ingredientName: item.ingredientName,
          category: item.category,
          storeId: item.storeId,
          store: item.storeRelation,
          isChecked: item.isChecked,
          isManuallyAdded: item.isManuallyAdded,
          checkedAt: item.checkedAt,
          checkedByUserId: item.checkedByUserId,
          checkedByUser: item.checkedByUser,
        },
        newStore: item.storeRelation?.name || null,
        userName,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });
      console.log('[move-store] ✅ Broadcast envoyé pour planId:', planIdNum);

      return NextResponse.json({ success: true, item });
    }

    // ========== CAS 2: Liste indépendante (listId) ==========
    if (listId) {
      const listIdNum = parseInt(listId);

      // Vérifier que l'utilisateur a accès à la liste
      const list = await db.shoppingList.findUnique({
        where: { id: listIdNum },
        include: { contributors: true },
      });

      if (!list) {
        return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
      }

      const isOwner = list.userId === session.user.id;
      const isContributor = list.contributors.some(
        (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
      );

      if (!isOwner && !isContributor) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }

      // Mettre à jour l'item (storeId et catégorie si fournie)
      const updateDataStandalone: { storeId: number | null; category?: string } = { storeId: storeId || null };
      if (category) {
        updateDataStandalone.category = category;
      }

      const standaloneItem = await db.standaloneShoppingItem.update({
        where: { id: itemId },
        data: updateDataStandalone,
        include: {
          checkedByUser: {
            select: { id: true, pseudo: true, name: true },
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

      // Mapper vers le format ShoppingListItem
      const mappedItem = {
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

      // Broadcaster le changement
      console.log('[move-store] 📡 Broadcasting pour listId:', listIdNum, 'newStore:', standaloneItem.storeRelation?.name || null);
      broadcastToClients(listIdNum, {
        type: "item_moved_store",
        item: mappedItem,
        newStore: standaloneItem.storeRelation?.name || null,
        userName,
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });
      console.log('[move-store] ✅ Broadcast envoyé pour listId:', listIdNum);

      return NextResponse.json({ success: true, item: mappedItem });
    }

    return NextResponse.json(
      { error: "Aucune action effectuée" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Move to store error:", error);
    return NextResponse.json(
      { error: "Erreur lors du déplacement vers l'enseigne" },
      { status: 500 }
    );
  }
}
