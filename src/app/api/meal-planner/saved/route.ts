import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const mealPlans = await db.weeklyMealPlan.findMany({
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
      },
      orderBy: {
        weekStart: 'desc',
      },
    });

    return NextResponse.json(mealPlans);
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des menus" },
      { status: 500 }
    );
  }
}
