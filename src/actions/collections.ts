"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, ActivityAction, EntityType } from "@/lib/activity-logger";

export async function getCollections() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  return db.collection.findMany({
    where: { userId: session.user.id },
    include: {
      recipes: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCollection(id: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return db.collection.findFirst({
    where: { id, userId: session.user.id },
    include: {
      recipes: {
        include: {
          ingredients: true,
          steps: true,
        },
      },
    },
  });
}

export async function createCollection(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    const collection = await db.collection.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color || "#f59e0b",
        icon: data.icon || "folder",
        userId: session.user.id,
      },
    });

    // Logger l'activité
    await logActivity({
      userId: session.user.id,
      action: ActivityAction.COLLECTION_CREATE,
      entityType: EntityType.COLLECTION,
      entityId: collection.id.toString(),
      entityName: collection.name,
    });

    revalidatePath("/profile");
    revalidatePath("/collections");
    return { success: true, collection };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { success: false, error: "Une collection avec ce nom existe déjà" };
    }
    return { success: false, error: "Erreur lors de la création" };
  }
}

export async function updateCollection(
  id: number,
  data: { name?: string; description?: string; color?: string; icon?: string }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    const collection = await db.collection.update({
      where: { id, userId: session.user.id },
      data,
      select: { id: true, name: true },
    });

    // Logger l'activité
    await logActivity({
      userId: session.user.id,
      action: ActivityAction.COLLECTION_UPDATE,
      entityType: EntityType.COLLECTION,
      entityId: collection.id.toString(),
      entityName: collection.name,
    });

    revalidatePath("/profile");
    revalidatePath("/collections");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function deleteCollection(id: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    const collection = await db.collection.delete({
      where: { id, userId: session.user.id },
      select: { id: true, name: true },
    });

    // Logger l'activité
    await logActivity({
      userId: session.user.id,
      action: ActivityAction.COLLECTION_DELETE,
      entityType: EntityType.COLLECTION,
      entityId: collection.id.toString(),
      entityName: collection.name,
    });

    revalidatePath("/profile");
    revalidatePath("/collections");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

export async function addRecipeToCollection(collectionId: number, recipeId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await db.collection.update({
      where: { id: collectionId, userId: session.user.id },
      data: {
        recipes: { connect: { id: recipeId } },
      },
    });

    revalidatePath("/profile");
    revalidatePath(`/recipes/${recipeId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de l'ajout" };
  }
}

export async function removeRecipeFromCollection(collectionId: number, recipeId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    await db.collection.update({
      where: { id: collectionId, userId: session.user.id },
      data: {
        recipes: { disconnect: { id: recipeId } },
      },
    });

    revalidatePath("/profile");
    revalidatePath(`/recipes/${recipeId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors du retrait" };
  }
}

export async function addRecipesToCollection(collectionId: number, recipeIds: number[]) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  if (recipeIds.length === 0) {
    return { success: false, error: "Aucune recette sélectionnée" };
  }

  try {
    await db.collection.update({
      where: { id: collectionId, userId: session.user.id },
      data: {
        recipes: {
          connect: recipeIds.map(id => ({ id }))
        },
      },
    });

    revalidatePath("/profile/collections");
    revalidatePath(`/profile/collections/${collectionId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de l'ajout des recettes" };
  }
}
