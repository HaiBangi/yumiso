import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { name, numberOfPeople } = body;

    // Calculer les dates de la semaine
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Créer un plan vide
    const plan = await db.weeklyMealPlan.create({
      data: {
        name: name || `Menu du ${new Date().toLocaleDateString("fr-FR")}`,
        weekStart: monday,
        weekEnd: sunday,
        numberOfPeople: numberOfPeople || 2,
        budget: "moyen",
        cookingTime: "moyen",
        mealTypes: [],
        cuisinePreferences: [],
        userId: session.user.id,
      },
      include: {
        meals: true,
      },
    });

    // Créer automatiquement la liste de courses associée
    await db.shoppingList.create({
      data: {
        name: `Liste de Courses - ${plan.name}`,
        userId: session.user.id,
        weeklyMealPlanId: plan.id,
        isPublic: false,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du menu" },
      { status: 500 }
    );
  }
}
