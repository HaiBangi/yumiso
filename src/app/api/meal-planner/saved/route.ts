import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Requête unique fusionnée pour charger tous les plans (owned + contributed)
    const allPlans = await db.weeklyMealPlan.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          {
            contributors: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        meals: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' },
          ],
        },
        contributors: {
          include: {
            user: {
              select: {
                id: true,
                pseudo: true,
                email: true,
                image: true,
              },
            },
          },
        },
        linkedShoppingLists: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
      orderBy: {
        weekStart: 'desc',
      },
    });

    // Ajouter les propriétés de permissions en fonction du ownership
    const plansWithPermissions = allPlans.map(plan => {
      const isOwner = plan.userId === session.user.id;
      const userContribution = plan.contributors.find(c => c.userId === session.user.id);

      return {
        ...plan,
        isOwner,
        canEdit: isOwner || userContribution?.role === "CONTRIBUTOR",
        canDelete: isOwner,
        canManageContributors: isOwner,
        userRole: isOwner ? null : (userContribution?.role || null),
      };
    });

    return NextResponse.json(plansWithPermissions);
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des menus" },
      { status: 500 }
    );
  }
}
