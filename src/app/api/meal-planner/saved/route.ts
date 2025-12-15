import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 1. Plans dont l'utilisateur est propriétaire
    const ownedPlans = await db.weeklyMealPlan.findMany({
      where: {
        userId: session.user.id,
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
      },
      orderBy: {
        weekStart: 'desc',
      },
    });

    // 2. Plans où l'utilisateur est contributeur
    const contributedPlans = await db.weeklyMealPlan.findMany({
      where: {
        contributors: {
          some: {
            userId: session.user.id,
          },
        },
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
      },
      orderBy: {
        weekStart: 'desc',
      },
    });

    // Ajouter les propriétés de permissions pour les plans possédés
    const ownedPlansWithPermissions = ownedPlans.map(plan => ({
      ...plan,
      isOwner: true,
      canEdit: true,
      canDelete: true,
      canManageContributors: true,
    }));

    // Ajouter les propriétés de permissions pour les plans partagés
    const contributedPlansWithPermissions = contributedPlans.map(plan => {
      const userContribution = plan.contributors.find(c => c.userId === session.user.id);
      return {
        ...plan,
        isOwner: false,
        canEdit: userContribution?.role === "CONTRIBUTOR",
        canDelete: false,
        canManageContributors: false,
      };
    });

    // Combiner les deux listes
    const allPlans = [...ownedPlansWithPermissions, ...contributedPlansWithPermissions];

    return NextResponse.json(allPlans);
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des menus" },
      { status: 500 }
    );
  }
}
