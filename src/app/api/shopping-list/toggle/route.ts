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

    const { planId, listId, ingredientName, category, isChecked } = await req.json();

    if ((!planId && !listId) || !ingredientName || !category || typeof isChecked !== "boolean") {
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
        (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
      );

      if (!isOwner && !isContributor) {
        return NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        );
      }

      // Upsert de l'ingrédient
      const shoppingListItem = await db.shoppingListItem.upsert({
        where: {
          weeklyMealPlanId_ingredientName_category: {
            weeklyMealPlanId: planIdNum,
            ingredientName,
            category,
          },
        },
        update: {
          isChecked,
          checkedAt: isChecked ? new Date() : null,
          checkedByUserId: isChecked ? session.user.id : null,
        },
        create: {
          weeklyMealPlanId: planIdNum,
          ingredientName,
          category,
          isChecked,
          checkedAt: isChecked ? new Date() : null,
          checkedByUserId: isChecked ? session.user.id : null,
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
        type: "ingredient_toggled",
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

      // Upsert de l'item (table StandaloneShoppingItem)
      const standaloneItem = await db.standaloneShoppingItem.upsert({
        where: {
          shoppingListId_name_category: {
            shoppingListId: listIdNum,
            name: ingredientName,
            category,
          },
        },
        update: {
          isChecked,
          checkedAt: isChecked ? new Date() : null,
          checkedByUserId: isChecked ? session.user.id : null,
        },
        create: {
          shoppingListId: listIdNum,
          name: ingredientName,
          category,
          isChecked,
          checkedAt: isChecked ? new Date() : null,
          checkedByUserId: isChecked ? session.user.id : null,
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

      // Broadcaster le changement
      broadcastToClients(listIdNum, {
        type: "ingredient_toggled",
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
    console.error("Error toggling ingredient:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}