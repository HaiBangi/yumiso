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
    const { planId, optimizedList } = body;

    if (!planId || !optimizedList) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    // Vérifier que le plan appartient à l'utilisateur
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan non trouvé" },
        { status: 404 }
      );
    }

    if (plan.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Mettre à jour le plan avec la liste de courses optimisée
    const updatedPlan = await db.weeklyMealPlan.update({
      where: { id: planId },
      data: {
        optimizedShoppingList: optimizedList, // Envoyer l'objet directement, pas JSON.stringify()
        updatedAt: new Date(),
      },
    });

    console.log("✅ Liste de courses optimisée sauvegardée pour le plan", planId);

    return NextResponse.json({
      success: true,
      message: "Liste de courses optimisée sauvegardée",
    });
  } catch (error) {
    console.error("❌ Erreur sauvegarde liste de courses:", error);
    
    let errorMessage = "Erreur inconnue";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
    }
    
    console.error("📋 Détails complets de l'erreur:", errorDetails);
    
    return NextResponse.json(
      {
        error: "Erreur lors de la sauvegarde",
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
