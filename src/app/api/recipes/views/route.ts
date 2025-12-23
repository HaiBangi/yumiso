import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  registerView,
  shouldCountView,
  updateViewsData,
  flushViews,
  getBufferStats,
} from "@/lib/views-helpers";

/**
 * POST /api/recipes/views
 * Enregistrer une vue de recette avec buffer en mémoire
 * - Ultra rapide (O(1) en RAM)
 * - Throttling côté client via cookie
 * - Flush automatique toutes les 30s
 */
export async function POST(request: NextRequest) {
  try {
    const { recipeId } = await request.json();

    if (!recipeId || typeof recipeId !== "number") {
      return NextResponse.json(
        { error: "Invalid recipe ID" },
        { status: 400 }
      );
    }

    // Vérifier que la recette existe (cache cette vérification si possible)
    const recipe = await db.recipe.findUnique({
      where: { id: recipeId, deletedAt: null },
      select: { id: true },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Récupérer le cookie de vues pour le throttling
    const viewsCookie = request.cookies.get("yumiso_views");
    let viewsData: Record<string, number> = {};

    if (viewsCookie?.value) {
      try {
        viewsData = JSON.parse(viewsCookie.value);
      } catch {
        viewsData = {};
      }
    }

    // Vérifier le throttling
    if (!shouldCountView(viewsData, recipeId)) {
      return NextResponse.json({
        success: false,
        reason: "throttled",
        message: "View already counted recently",
      });
    }

    // ✅ Enregistrer la vue dans le buffer (ultra rapide, pas de DB)
    registerView(recipeId);

    // Mettre à jour les données de vues
    const updatedViewsData = updateViewsData(viewsData, recipeId);

    // Créer la réponse avec le cookie mis à jour
    const response = NextResponse.json({
      success: true,
      message: "View registered",
      buffered: true,
    });

    // Définir le cookie (expire dans 24h)
    response.cookies.set("yumiso_views", JSON.stringify(updatedViewsData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 heures
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error registering view:", error);
    return NextResponse.json(
      { error: "Failed to register view" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recipes/views
 * Récupérer les stats du buffer (admin only)
 */
export async function GET() {
  try {
    const stats = getBufferStats();
    return NextResponse.json({
      buffer: stats,
      message: `${stats.totalViews} views pending for ${stats.recipes} recipes`,
    });
  } catch (error) {
    console.error("Error getting view stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/recipes/views
 * Forcer un flush du buffer (admin only, utile pour debug)
 */
export async function PUT() {
  try {
    const result = await flushViews();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Flushed ${result.total} views for ${result.flushed} recipes`,
    });
  } catch (error) {
    console.error("Error flushing views:", error);
    return NextResponse.json(
      { error: "Failed to flush views" },
      { status: 500 }
    );
  }
}
