"use server";

// Force reload: 2025-12-08 16:05 - FINAL FIX

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateRecipeRating } from "@/lib/rating-helper";
import { revalidatePath } from "next/cache";
import { logActivity, ActivityAction, EntityType } from "@/lib/activity-logger";

export async function addComment(recipeId: number, text: string, rating?: number) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Connectez-vous pour commenter" };
  }

  if (!text.trim() || text.length > 1000) {
    return { success: false, error: "Commentaire invalide (1-1000 caractères)" };
  }

  if (rating !== undefined && (rating < 0 || rating > 10)) {
    return { success: false, error: "Note invalide (0-10)" };
  }

  try {
    const comment = await db.comment.create({
      data: {
        text: text.trim(),
        rating: rating !== undefined ? rating : null,
        userId: session.user.id,
        recipeId,
      },
      include: {
        recipe: {
          select: { name: true },
        },
      },
    });

    // Recalculer la note moyenne de la recette
    await updateRecipeRating(recipeId);

    // Logger l'activité
    await logActivity({
      userId: session.user.id,
      action: ActivityAction.COMMENT_CREATE,
      entityType: EntityType.COMMENT,
      entityId: comment.id.toString(),
      entityName: comment.recipe.name,
      details: {
        hasRating: rating !== undefined,
        rating: rating,
      },
    });

    revalidatePath(`/recipes/${recipeId}`);
    return { success: true, data: comment };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { success: false, error: "Erreur lors de l'ajout du commentaire" };
  }
}

export async function deleteComment(commentId: number) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  try {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, recipeId: true },
    });

    if (!comment) {
      return { success: false, error: "Commentaire non trouvé" };
    }

    // Check if user is owner or admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (comment.userId !== session.user.id && user?.role !== "ADMIN") {
      return { success: false, error: "Vous ne pouvez pas supprimer ce commentaire" };
    }

    await db.comment.delete({ where: { id: commentId } });

    // Recalculer la note moyenne de la recette
    await updateRecipeRating(comment.recipeId);

    revalidatePath(`/recipes/${comment.recipeId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

export async function updateComment(commentId: number, text: string, rating?: number) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  if (!text.trim() || text.length > 1000) {
    return { success: false, error: "Commentaire invalide (1-1000 caractères)" };
  }

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return { success: false, error: "Note invalide (1-5)" };
  }

  try {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, recipeId: true },
    });

    if (!comment) {
      return { success: false, error: "Commentaire non trouvé" };
    }

    if (comment.userId !== session.user.id) {
      return { success: false, error: "Vous ne pouvez pas modifier ce commentaire" };
    }

    const updatedComment = await db.comment.update({
      where: { id: commentId },
      data: {
        text: text.trim(),
        rating: rating !== undefined ? rating : null,
      },
    });

    // Recalculer la note moyenne de la recette
    await updateRecipeRating(comment.recipeId);

    revalidatePath(`/recipes/${comment.recipeId}`);
    return { success: true, data: updatedComment };
  } catch (error) {
    console.error("Error updating comment:", error);
    return { success: false, error: "Erreur lors de la modification" };
  }
}

export async function getRecipeComments(recipeId: number) {
  const comments = await db.comment.findMany({
    where: {
      recipeId,
      deletedAt: null, // Exclure les commentaires soft-deleted
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          pseudo: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return comments;
}

