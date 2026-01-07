import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/stores - Liste des enseignes actives (globales + celles créées par l'user)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const stores = await db.store.findMany({
      where: {
        isActive: true,
        OR: [
          { isGlobal: true }, // Enseignes globales pour tous
          ...(userId ? [{ userId }] : []), // Enseignes perso de l'utilisateur
        ],
      },
      orderBy: [
        { displayOrder: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        logoUrl: true,
        color: true,
        displayOrder: true,
        isActive: true,
        isGlobal: true,
        userId: true,
      },
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des enseignes" },
      { status: 500 }
    );
  }
}

// POST /api/stores - Créer une nouvelle enseigne (admin uniquement)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN" && user?.role !== "OWNER") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, logoUrl, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Le nom est requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'enseigne globale existe déjà
    const existing = await db.store.findFirst({
      where: {
        name,
        isGlobal: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Cette enseigne globale existe déjà" },
        { status: 409 }
      );
    }

    // Créer l'enseigne globale (admin uniquement)
    const store = await db.store.create({
      data: {
        name,
        logoUrl: logoUrl || null,
        color: color || "#6B7280",
        isActive: true,
        isGlobal: true,
        userId: null,
        displayOrder: 999, // Sera trié en dernier
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'enseigne" },
      { status: 500 }
    );
  }
}
