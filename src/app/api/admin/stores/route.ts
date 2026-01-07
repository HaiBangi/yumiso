import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { stores } = await req.json();

    if (!Array.isArray(stores)) {
      return NextResponse.json({ error: "Format invalide" }, { status: 400 });
    }

    // Mettre à jour chaque enseigne
    const updatePromises = stores.map((store) =>
      db.store.update({
        where: { id: store.id },
        data: {
          name: store.name,
          logoUrl: store.logoUrl,
          color: store.color,
          displayOrder: store.displayOrder,
          isActive: store.isActive,
        },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: "Enseignes mises à jour avec succès",
    });
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour des enseignes:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
