import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActivityLogs } from "@/lib/activity-logger";

export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin/owner
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer le rôle depuis la session ou la base de données
    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Récupérer les paramètres de pagination et filtres
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "50");
    const action = searchParams.get("action") || undefined;

    // Récupérer les logs
    const result = await getActivityLogs({
      page,
      perPage,
      action: action as any,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la récupération des logs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des logs" },
      { status: 500 }
    );
  }
}
