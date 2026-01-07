import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { broadcastToClients } from "@/lib/sse-clients";

// PATCH /api/stores/[storeId] - Renommer une enseigne et déplacer tous les items
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { storeId } = await params;
    const storeIdNum = parseInt(storeId);

    if (isNaN(storeIdNum)) {
      return NextResponse.json(
        { error: "ID d'enseigne invalide" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { newName } = body;

    if (!newName || typeof newName !== 'string') {
      return NextResponse.json(
        { error: "Le nouveau nom est requis" },
        { status: 400 }
      );
    }

    const trimmedNewName = newName.trim();

    if (!trimmedNewName) {
      return NextResponse.json(
        { error: "Le nouveau nom ne peut pas être vide" },
        { status: 400 }
      );
    }

    // Vérifier que l'enseigne existe et appartient à l'utilisateur (ou est globale pour un admin)
    const oldStore = await db.store.findUnique({
      where: { id: storeIdNum },
    });

    if (!oldStore) {
      return NextResponse.json(
        { error: "Enseigne non trouvée" },
        { status: 404 }
      );
    }

    // Seul le propriétaire d'une enseigne perso peut la modifier (ou un admin pour les globales)
    if (!oldStore.isGlobal && oldStore.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas modifier cette enseigne" },
        { status: 403 }
      );
    }

    // Chercher si une enseigne avec le nouveau nom existe déjà
    const existingStore = await db.store.findFirst({
      where: {
        name: trimmedNewName,
        OR: [
          { isGlobal: true },
          { userId: session.user.id },
        ],
        isActive: true,
      },
    });

    let targetStore;

    if (existingStore) {
      // L'enseigne cible existe déjà, on va fusionner
      targetStore = existingStore;
      console.log(`[API /stores/rename] Fusion vers enseigne existante: ${targetStore.name} (ID: ${targetStore.id})`);
    } else {
      // Créer ou renommer
      if (oldStore.userId === session.user.id && !oldStore.isGlobal) {
        // C'est une enseigne perso de l'utilisateur, on peut la renommer directement
        targetStore = await db.store.update({
          where: { id: oldStore.id },
          data: { name: trimmedNewName },
        });
        console.log(`[API /stores/rename] Enseigne renommée: ${oldStore.name} → ${targetStore.name}`);
      } else {
        // Créer une nouvelle enseigne perso
        targetStore = await db.store.create({
          data: {
            name: trimmedNewName,
            isGlobal: false,
            userId: session.user.id,
            color: oldStore.color,
          },
        });
        console.log(`[API /stores/rename] Nouvelle enseigne créée: ${targetStore.name} (ID: ${targetStore.id})`);
      }
    }

    // Déplacer tous les items vers la nouvelle enseigne
    const [updatedShoppingListItems, updatedStandaloneItems] = await Promise.all([
      db.shoppingListItem.updateMany({
        where: { storeId: oldStore.id },
        data: { storeId: targetStore.id },
      }),
      db.standaloneShoppingItem.updateMany({
        where: { storeId: oldStore.id },
        data: { storeId: targetStore.id },
      }),
    ]);

    console.log(`[API /stores/rename] ${updatedShoppingListItems.count} plan items + ${updatedStandaloneItems.count} standalone items déplacés`);

    // Broadcaster les changements via SSE - Récupérer les items modifiés
    const [movedPlanItems, movedStandaloneItems] = await Promise.all([
      db.shoppingListItem.findMany({
        where: { storeId: targetStore.id },
        include: {
          storeRelation: { select: { id: true, name: true, logoUrl: true, color: true, isGlobal: true, userId: true } },
        },
      }),
      db.standaloneShoppingItem.findMany({
        where: { storeId: targetStore.id },
        include: {
          storeRelation: { select: { id: true, name: true, logoUrl: true, color: true, isGlobal: true, userId: true } },
        },
      }),
    ]);

    // Broadcaster par planId
    const planMap = new Map<number, typeof movedPlanItems>();
    movedPlanItems.forEach(i => {
      if (!planMap.has(i.weeklyMealPlanId)) planMap.set(i.weeklyMealPlanId, []);
      planMap.get(i.weeklyMealPlanId)!.push(i);
    });
    planMap.forEach((its, pid) => {
      its.forEach(i => broadcastToClients(pid, {
        type: "item_moved_store",
        item: { ...i, store: i.storeRelation, storeRelation: undefined },
        newStore: targetStore.name,
        userName: session.user.name || session.user.email || "Un utilisateur",
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      }));
    });

    // Broadcaster par listId
    const listMap = new Map<number, typeof movedStandaloneItems>();
    movedStandaloneItems.forEach(i => {
      if (!listMap.has(i.shoppingListId)) listMap.set(i.shoppingListId, []);
      listMap.get(i.shoppingListId)!.push(i);
    });
    listMap.forEach((its, lid) => {
      its.forEach(i => broadcastToClients(lid, {
        type: "item_moved_store",
        item: { id: i.id, ingredientName: i.name, category: i.category, storeId: i.storeId, store: i.storeRelation, isChecked: i.isChecked, isManuallyAdded: i.isManuallyAdded, checkedAt: i.checkedAt, checkedByUserId: i.checkedByUserId },
        newStore: targetStore.name,
        userName: session.user.name || session.user.email || "Un utilisateur",
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      }));
    });

    // Si on a créé une nouvelle enseigne ou fusionné, supprimer l'ancienne (si c'est une enseigne perso de l'user)
    if (targetStore.id !== oldStore.id && oldStore.userId === session.user.id) {
      await db.store.delete({
        where: { id: oldStore.id },
      });
      console.log(`[API /stores/rename] Ancienne enseigne supprimée: ${oldStore.name} (ID: ${oldStore.id})`);
    }

    return NextResponse.json({
      success: true,
      store: targetStore,
      movedItems: updatedShoppingListItems.count + updatedStandaloneItems.count,
    });
  } catch (error) {
    console.error("[API /stores/rename] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du renommage de l'enseigne" },
      { status: 500 }
    );
  }
}

// DELETE /api/stores/[storeId] - Supprimer une enseigne (déplace les items vers "Sans enseigne")
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { storeId } = await params;
    const storeIdNum = parseInt(storeId);

    if (isNaN(storeIdNum)) {
      return NextResponse.json(
        { error: "ID d'enseigne invalide" },
        { status: 400 }
      );
    }

    // Vérifier que l'enseigne existe et appartient à l'utilisateur
    const store = await db.store.findUnique({
      where: { id: storeIdNum },
      include: {
        shoppingListItems: true,
        standaloneShoppingItems: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Enseigne non trouvée" },
        { status: 404 }
      );
    }

    // Seul le propriétaire d'une enseigne perso peut la supprimer
    if (!store.userId || store.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez supprimer que vos enseignes personnelles" },
        { status: 403 }
      );
    }

    // Déplacer tous les items vers "Sans enseigne" (storeId = null)
    const [updatedShoppingListItems, updatedStandaloneItems] = await Promise.all([
      db.shoppingListItem.updateMany({
        where: { storeId: store.id },
        data: { storeId: null },
      }),
      db.standaloneShoppingItem.updateMany({
        where: { storeId: store.id },
        data: { storeId: null },
      }),
    ]);

    console.log(`[API /stores/delete] ${updatedShoppingListItems.count} plan items + ${updatedStandaloneItems.count} standalone items déplacés vers "Sans enseigne"`);

    // Broadcaster les changements via SSE pour chaque item déplacé
    store.shoppingListItems.forEach(item => {
      broadcastToClients(item.weeklyMealPlanId, {
        type: "item_moved_store",
        item: {
          ...item,
          storeId: null,
          store: null,
        },
        newStore: null,
        userName: session.user.name || session.user.email || "Un utilisateur",
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });
    });

    store.standaloneShoppingItems.forEach(item => {
      broadcastToClients(item.shoppingListId, {
        type: "item_moved_store",
        item: {
          id: item.id,
          ingredientName: item.name,
          category: item.category,
          storeId: null,
          store: null,
          isChecked: item.isChecked,
          isManuallyAdded: item.isManuallyAdded,
          checkedAt: item.checkedAt,
          checkedByUserId: item.checkedByUserId,
        },
        newStore: null,
        userName: session.user.name || session.user.email || "Un utilisateur",
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });
    });

    // Supprimer l'enseigne
    await db.store.delete({
      where: { id: store.id },
    });

    console.log(`[API /stores/delete] Enseigne supprimée: ${store.name} (ID: ${store.id})`);

    return NextResponse.json({
      success: true,
      movedItems: updatedShoppingListItems.count + updatedStandaloneItems.count,
    });
  } catch (error) {
    console.error("[API /stores/delete] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'enseigne" },
      { status: 500 }
    );
  }
}
