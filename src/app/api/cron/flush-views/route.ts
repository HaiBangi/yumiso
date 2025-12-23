import { NextResponse } from "next/server";
import { flushViews, getBufferStats } from "@/lib/views-helpers";

/**
 * GET /api/cron/flush-views
 * 
 * Endpoint pour Vercel Cron Jobs - flush le buffer de vues toutes les minutes.
 * 
 * Configuration dans vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/flush-views",
 *     "schedule": "* * * * *"
 *   }]
 * }
 * 
 * Note: Sur Vercel, les fonctions serverless sont stateless.
 * Le buffer en mémoire ne persiste qu'au sein d'une même instance.
 * Pour une solution plus robuste en prod Vercel, utiliser Redis.
 */
export async function GET(request: Request) {
  try {
    // Vérifier le secret pour sécuriser l'endpoint
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // En prod, vérifier le secret Vercel Cron
    if (process.env.NODE_ENV === "production" && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Récupérer les stats avant flush
    const beforeStats = getBufferStats();

    // Flush le buffer
    const result = await flushViews();

    return NextResponse.json({
      success: true,
      before: beforeStats,
      flushed: result.flushed,
      totalViews: result.total,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Flush views error:", error);
    return NextResponse.json(
      { error: "Failed to flush views" },
      { status: 500 }
    );
  }
}

// Désactiver le cache pour ce endpoint
export const dynamic = "force-dynamic";
export const revalidate = 0;
