import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Normalise une chaîne pour la recherche (supprime accents et met en minuscule)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Optimisation : Recherche directe dans la DB avec Prisma au lieu de charger tous les users
    // Note: mode 'insensitive' gère la casse mais pas les accents aussi précisément que normalizeString
    const users = await db.user.findMany({
      where: {
        pseudo: {
          contains: query,
          mode: 'insensitive'
        },
      },
      select: {
        id: true,
        pseudo: true,
        email: true,
        image: true,
      },
      orderBy: {
        pseudo: 'asc'
      },
      take: 10,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erreur recherche utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
