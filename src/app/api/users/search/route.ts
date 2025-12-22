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

    const normalizedQuery = normalizeString(query);

    // Récupérer tous les utilisateurs
    const users = await db.user.findMany({
      select: {
        id: true,
        pseudo: true,
        email: true,
        image: true,
      },
      take: 20,
    });

    // Filtrer côté serveur avec normalisation (insensible à la casse et aux accents)
    const filtered = users.filter((user) => {
      const normalizedPseudo = normalizeString(user.pseudo);
      return normalizedPseudo.includes(normalizedQuery);
    });

    // Trier par pertinence (ceux qui commencent par la query en premier)
    filtered.sort((a, b) => {
      const aNormalized = normalizeString(a.pseudo);
      const bNormalized = normalizeString(b.pseudo);
      const aStartsWith = aNormalized.startsWith(normalizedQuery);
      const bStartsWith = bNormalized.startsWith(normalizedQuery);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.pseudo.localeCompare(b.pseudo);
    });

    return NextResponse.json(filtered.slice(0, 10));
  } catch (error) {
    console.error("Erreur recherche utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
