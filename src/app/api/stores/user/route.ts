import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/stores/user - Créer ou trouver une enseigne (globale ou perso)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { storeName } = body;

    if (!storeName || typeof storeName !== 'string') {
      return NextResponse.json(
        { error: "Le nom de l'enseigne est requis" },
        { status: 400 }
      );
    }

    const trimmedName = storeName.trim();

    if (!trimmedName) {
      return NextResponse.json(
        { error: "Le nom de l'enseigne ne peut pas être vide" },
        { status: 400 }
      );
    }

    // 1. Chercher si une enseigne globale existe
    let store = await db.store.findFirst({
      where: {
        name: trimmedName,
        isGlobal: true,
        isActive: true,
      },
    });

    if (store) {
      console.log(`[API /stores/user] Enseigne globale trouvée: ${store.name} (ID: ${store.id})`);
      return NextResponse.json({ store, created: false });
    }

    // 2. Chercher si l'utilisateur a déjà créé cette enseigne
    store = await db.store.findFirst({
      where: {
        name: trimmedName,
        userId: session.user.id,
        isActive: true,
      },
    });

    if (store) {
      console.log(`[API /stores/user] Enseigne perso trouvée: ${store.name} (ID: ${store.id})`);
      return NextResponse.json({ store, created: false });
    }

    // 3. Créer une nouvelle enseigne personnalisée
    store = await db.store.create({
      data: {
        name: trimmedName,
        isGlobal: false,
        userId: session.user.id,
        isActive: true,
        color: '#6B7280', // Couleur par défaut
      },
    });

    console.log(`[API /stores/user] ✨ Nouvelle enseigne perso créée: ${store.name} (ID: ${store.id})`);

    return NextResponse.json({ store, created: true }, { status: 201 });
  } catch (error) {
    console.error("[API /stores/user] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'enseigne" },
      { status: 500 }
    );
  }
}
