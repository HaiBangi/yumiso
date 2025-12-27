import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { planId } = await params;
    const planIdNum = parseInt(planId);

    if (isNaN(planIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier que l'utilisateur est propriétaire du plan
    const plan = await db.weeklyMealPlan.findFirst({
      where: {
        id: planIdNum,
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        isFavorite: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    // Toggle le favori
    const updatedPlan = await db.weeklyMealPlan.update({
      where: { id: planIdNum },
      data: {
        isFavorite: !plan.isFavorite,
      },
      select: {
        id: true,
        isFavorite: true,
      },
    });

    return NextResponse.json({
      success: true,
      isFavorite: updatedPlan.isFavorite,
    });
  } catch (error) {
    console.error("Erreur toggle favori:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du favori" },
      { status: 500 }
    );
  }
}
