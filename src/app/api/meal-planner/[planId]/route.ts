import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { planId: planIdStr } = await params;
    const planId = parseInt(planIdStr);

    if (isNaN(planId)) {
      return NextResponse.json(
        { error: "ID de plan invalide" },
        { status: 400 }
      );
    }

    // Récupérer le plan avec vérification des permissions
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      include: {
        contributors: true,
        meals: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrl: true,
              },
            },
          },
        },
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
      (c) => c.userId === session.user.id
    );

    if (!isOwner && !isContributor) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      plan: {
        id: plan.id,
        name: plan.name,
        weekStart: plan.weekStart,
        weekEnd: plan.weekEnd,
        numberOfPeople: plan.numberOfPeople,
        shoppingList: plan.shoppingList,
        optimizedShoppingList: plan.optimizedShoppingList,
        meals: plan.meals,
      },
    });
  } catch (error) {
    console.error("Error fetching plan:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
