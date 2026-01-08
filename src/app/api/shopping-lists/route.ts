import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { logActivity, ActivityAction, EntityType } from "@/lib/activity-logger";

// GET - Récupérer toutes les listes de courses de l'utilisateur
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Supporter le filtre par planId
    const { searchParams } = new URL(request.url);
    const planIdParam = searchParams.get('planId');
    const planId = planIdParam ? parseInt(planIdParam) : null;

    // Construire la clause OR pour inclure toutes les listes accessibles
    const accessConditions = [
      // Propriétaire de la liste
      { userId: session.user.id },
      // Contributeur direct de la liste
      { contributors: { some: { userId: session.user.id } } },
      // Propriétaire du WeeklyMealPlan lié
      { weeklyMealPlan: { userId: session.user.id } },
      // Contributeur du WeeklyMealPlan lié
      { weeklyMealPlan: { contributors: { some: { userId: session.user.id } } } },
    ];

    const whereClause: Record<string, unknown> = {
      OR: accessConditions,
      deletedAt: null,
    };

    // Filtrer par planId si fourni
    if (planId) {
      whereClause.weeklyMealPlanId = planId;
    }

    const lists = await db.shoppingList.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, pseudo: true, name: true, image: true } },
        weeklyMealPlan: {
          select: {
            id: true,
            name: true,
            userId: true,
            contributors: {
              select: { userId: true, role: true }
            },
            // Compter les items depuis la table ShoppingListItem (source unique de vérité)
            shoppingListItems: {
              select: {
                id: true,
                isChecked: true,
              }
            },
            _count: {
              select: { shoppingListItems: true }
            }
          }
        },
        // Items standalone (pour les listes non liées à un menu)
        items: {
          select: {
            id: true,
            isChecked: true,
          }
        },
        contributors: {
          include: {
            user: { select: { id: true, pseudo: true, name: true, image: true } }
          }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { updatedAt: "desc" },
    });

    // Enrichir avec les statistiques et permissions
    const enrichedLists = lists.map(list => {
      const isOwner = list.userId === session.user.id;
      const isMealPlanOwner = list.weeklyMealPlan?.userId === session.user.id;
      const isMealPlanContributor = list.weeklyMealPlan?.contributors?.some(
        c => c.userId === session.user.id
      ) || false;

      // Déterminer le rôle de l'utilisateur dans la liste
      const listContributor = list.contributors.find(c => c.userId === session.user.id);
      const userRole = listContributor?.role || null;

      let totalItems: number;
      let checkedItems: number;

      if (list.weeklyMealPlanId && list.weeklyMealPlan) {
        // Liste liée à un menu - utiliser ShoppingListItem (source unique de vérité)
        const shoppingItems = list.weeklyMealPlan.shoppingListItems || [];
        totalItems = shoppingItems.length;
        checkedItems = shoppingItems.filter(i => i.isChecked).length;
      } else {
        // Liste standalone - utiliser les items (StandaloneShoppingItem)
        totalItems = list.items.length;
        checkedItems = list.items.filter(i => i.isChecked).length;
      }

      return {
        ...list,
        totalItems,
        checkedItems,
        isOwner: isOwner || isMealPlanOwner,
        isMealPlanContributor,
        userRole,
      };
    });

    return NextResponse.json(enrichedLists);
  } catch (error) {
    console.error("Erreur GET /api/shopping-lists:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des listes" },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle liste de courses
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, icon, weeklyMealPlanId, items } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom de la liste est requis" },
        { status: 400 }
      );
    }

    // Générer un code de partage unique
    const shareCode = nanoid(10);

    const list = await db.shoppingList.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#10b981",
        icon: icon || "shopping-cart",
        userId: session.user.id,
        weeklyMealPlanId: weeklyMealPlanId || null,
        shareCode,
        items: items && items.length > 0 ? {
          create: items.map((item: { name: string; quantity?: string; category: string }, index: number) => ({
            name: item.name,
            quantity: item.quantity || null,
            category: item.category || "Autres",
            order: index,
          }))
        } : undefined,
      },
      include: {
        items: true,
        user: { select: { id: true, pseudo: true, name: true } },
      }
    });

    // Logger l'activité
    await logActivity({
      userId: session.user.id,
      action: ActivityAction.SHOPPING_LIST_CREATE,
      entityType: EntityType.SHOPPING_LIST,
      entityId: list.id.toString(),
      entityName: list.name,
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/shopping-lists:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la liste" },
      { status: 500 }
    );
  }
}
