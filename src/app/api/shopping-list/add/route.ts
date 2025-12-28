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

    const { planId, listId, ingredientName, category } = await req.json();

    if ((!planId && !listId) || !ingredientName) {
      return NextResponse.json(
        { error: "Paramètres manquants (planId ou listId requis)" },
        { status: 400 }
      );
    }

    const itemCategory = category || "Autres";
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
          isManuallyAdded: true,
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

      // Vérifier si l'item existe déjà
      const existingItem = await db.standaloneShoppingItem.findFirst({
        where: {
          shoppingListId: listIdNum,
          name: ingredientName.trim(),
          category: itemCategory,
        },
      });

      if (existingItem) {
        return NextResponse.json(
          { error: "Cet article existe déjà dans la liste" },
          { status: 409 }
        );
      }

      // Créer le nouvel item (table StandaloneShoppingItem)
      const standaloneItem = await db.standaloneShoppingItem.create({
        data: {
          shoppingListId: listIdNum,
          name: ingredientName.trim(),
          category: itemCategory,
          isChecked: false,
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

      // Mapper vers le format ShoppingListItem pour la cohérence
      const item = {
        id: standaloneItem.id,
        ingredientName: standaloneItem.name,
        category: standaloneItem.category,
        isChecked: standaloneItem.isChecked,
        isManuallyAdded: true,
        checkedAt: standaloneItem.checkedAt,
        checkedByUserId: standaloneItem.checkedByUserId,
        checkedByUser: standaloneItem.checkedByUser,
      };

      // Broadcaster l'ajout (utilise listId comme identifiant)
      broadcastToClients(listIdNum, {
        type: "item_added",
        item,
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
    console.error("Error adding item:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}