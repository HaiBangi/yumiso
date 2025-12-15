import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const planId = parseInt(id);
    if (isNaN(planId)) {
      return NextResponse.json(
        { error: "ID invalide" },
        { status: 400 }
      );
    }

    const session = await auth();

    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
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
        user: {
          select: {
            id: true,
            name: true,
            pseudo: true,
          },
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
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Menu non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier l'accès
    const isOwner = session?.user?.id === plan.userId;
    
    // Vérifier si l'utilisateur est contributeur
    const contributor = plan.contributors.find(c => c.userId === session?.user?.id);
    const canEdit = isOwner || (contributor && contributor.role === "CONTRIBUTOR");
    const canView = isOwner || contributor !== undefined || plan.isPublic;

    if (!canView) {
      return NextResponse.json(
        { error: "Accès refusé - Ce menu est privé" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ...plan,
      isOwner,
      canEdit,
    });
  } catch (error) {
    console.error("❌ Erreur récupération menu:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du menu" },
      { status: 500 }
    );
  }
}

// Route pour mettre à jour la visibilité du menu
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await context.params;
    const planId = parseInt(id);
    if (isNaN(planId)) {
      return NextResponse.json(
        { error: "ID invalide" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isPublic } = body;

    console.log('🔍 DEBUG toggle public:', {
      planId,
      isPublic,
      userId: session.user.id,
    });

    // Vérifier que le plan appartient à l'utilisateur
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
    });

    console.log('📋 Plan trouvé:', {
      found: !!plan,
      planId: plan?.id,
      currentIsPublic: plan?.isPublic,
      owner: plan?.userId,
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Menu non trouvé" },
        { status: 404 }
      );
    }

    if (plan.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Mettre à jour la visibilité
    const updatedPlan = await db.weeklyMealPlan.update({
      where: { id: planId },
      data: {
        isPublic: isPublic === true,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Menu ${planId} visibilité changée:`, isPublic ? 'Public' : 'Privé');

    return NextResponse.json({
      success: true,
      isPublic: updatedPlan.isPublic,
    });
  } catch (error) {
    console.error("❌ Erreur mise à jour visibilité:", error);
    
    let errorMessage = "Erreur lors de la mise à jour";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
    }
    
    console.error("📋 Détails complets de l'erreur:", {
      message: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json(
      { 
        error: "Erreur lors de la mise à jour",
        message: errorMessage,
        details: errorDetails.substring(0, 200), // Limiter la taille
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
