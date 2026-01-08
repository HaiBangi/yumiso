import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Ajouter un contributeur à une liste
export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listId } = await params;
    const listIdNum = parseInt(listId);

    if (isNaN(listIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body = await request.json();
    const { email, pseudo, userId, role = "CONTRIBUTOR" } = body;

    // Au moins un identifiant requis
    if (!email && !pseudo && !userId) {
      return NextResponse.json({ error: "Email, pseudo ou userId requis" }, { status: 400 });
    }

    // Vérifier que l'utilisateur est propriétaire de la liste
    const list = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        contributors: {
          include: {
            user: { select: { id: true, pseudo: true, name: true, image: true } }
          }
        }
      }
    });

    if (!list) {
      return NextResponse.json({ error: "Liste non trouvée ou accès refusé" }, { status: 404 });
    }

    // Trouver l'utilisateur par userId, email ou pseudo
    let userToAdd = null;

    if (userId) {
      userToAdd = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, pseudo: true, name: true, image: true, email: true }
      });
    } else if (email) {
      userToAdd = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, pseudo: true, name: true, image: true, email: true }
      });
    } else if (pseudo) {
      userToAdd = await db.user.findFirst({
        where: { pseudo: { equals: pseudo, mode: 'insensitive' } },
        select: { id: true, pseudo: true, name: true, image: true, email: true }
      });
    }

    if (!userToAdd) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur n'est pas déjà contributeur
    const existingContributor = list.contributors.find(c => c.user.id === userToAdd.id);
    if (existingContributor) {
      return NextResponse.json({ error: "Cet utilisateur est déjà contributeur" }, { status: 409 });
    }

    // Vérifier que ce n'est pas le propriétaire
    if (userToAdd.id === session.user.id) {
      return NextResponse.json({ error: "Vous êtes déjà propriétaire de cette liste" }, { status: 400 });
    }

    // Ajouter le contributeur
    const newContributor = await db.shoppingListContributor.create({
      data: {
        shoppingListId: listIdNum,
        userId: userToAdd.id,
        role: role === "VIEWER" ? "VIEWER" : role === "ADMIN" ? "ADMIN" : "EDITOR",
      },
      include: {
        user: { select: { id: true, pseudo: true, name: true, image: true, email: true } }
      }
    });

    return NextResponse.json(newContributor);
  } catch (error) {
    console.error("Erreur POST /api/shopping-lists/[listId]/contributors:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du contributeur" },
      { status: 500 }
    );
  }
}

// GET - Lister les contributeurs d'une liste
export async function GET(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { listId } = await params;
    const listIdNum = parseInt(listId);

    if (isNaN(listIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier l'accès à la liste
    const list = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        deletedAt: null,
        OR: [
          { userId: session.user.id },
          { contributors: { some: { userId: session.user.id } } },
          { weeklyMealPlan: { userId: session.user.id } },
          { weeklyMealPlan: { contributors: { some: { userId: session.user.id } } } },
        ]
      },
      include: {
        user: { select: { id: true, pseudo: true, name: true, image: true } },
        contributors: {
          include: {
            user: { select: { id: true, pseudo: true, name: true, image: true } }
          }
        }
      }
    });

    if (!list) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }

    const isOwner = list.userId === session.user.id;
    const userContributor = list.contributors.find(c => c.user.id === session.user.id);
    const isAdmin = userContributor?.role === "ADMIN";

    return NextResponse.json({
      owner: list.user,
      contributors: list.contributors,
      isOwner,
      isAdmin,
      canManageContributors: isOwner || isAdmin
    });
  } catch (error) {
    console.error("Erreur GET /api/shopping-lists/[listId]/contributors:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des contributeurs" },
      { status: 500 }
    );
  }
}
