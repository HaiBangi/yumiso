"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { recipeCreateSchema, recipeUpdateSchema } from "@/lib/validations";
import type { RecipeCreateInput } from "@/lib/validations";

export type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

export async function createRecipe(
  input: RecipeCreateInput
): Promise<ActionResult<{ id: number }>> {
  try {
    const session = await auth();
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      return { success: false, error: "Vous devez être connecté pour créer une recette" };
    }

    // Check if user has permission to create recipes
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, pseudo: true },
    });

    if (!user || user.role === "READER") {
      return { success: false, error: "Vous n'avez pas la permission de créer des recettes. Contactez un administrateur pour devenir contributeur." };
    }

    const validation = recipeCreateSchema.safeParse(input);

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const { ingredients, steps, ...recipeData } = validation.data;

    // Get user's pseudo if author is not explicitly set
    let authorName = recipeData.author;
    if (!authorName || authorName === "") {
      authorName = user.pseudo || "Anonyme";
    }

    const recipe = await db.recipe.create({
      data: {
        ...recipeData,
        author: authorName,
        userId: session.user.id,
        ingredients: { create: ingredients },
        steps: { create: steps },
      },
    });

    revalidatePath("/recipes");
    revalidatePath("/profile/recipes");
    return { success: true, data: { id: recipe.id } };
  } catch (error) {
    console.error("Failed to create recipe:", error);
    return { success: false, error: "Erreur lors de la création de la recette" };
  }
}

export async function updateRecipe(
  id: number,
  input: Partial<RecipeCreateInput>
): Promise<ActionResult> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { success: false, error: "Vous devez être connecté pour modifier une recette" };
    }

    // Get user and recipe
    const [user, recipe] = await Promise.all([
      db.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
      db.recipe.findUnique({ where: { id }, select: { userId: true } }),
    ]);

    if (!user || !recipe) {
      return { success: false, error: "Utilisateur ou recette non trouvé" };
    }

    // Check permissions: must be owner or admin
    const isOwner = recipe.userId === session.user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Vous n'avez pas la permission de modifier cette recette" };
    }

    const validation = recipeUpdateSchema.safeParse(input);

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const { ingredients, steps, ...recipeData } = validation.data;

    // Delete existing related records first
    if (ingredients) {
      await db.ingredient.deleteMany({ where: { recipeId: id } });
    }
    if (steps) {
      await db.step.deleteMany({ where: { recipeId: id } });
    }

    // Update the recipe
    await db.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        ...(ingredients && { ingredients: { create: ingredients } }),
        ...(steps && { steps: { create: steps } }),
      },
    });

    revalidatePath("/recipes");
    revalidatePath(`/recipes/${id}`);
    revalidatePath("/profile/recipes");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update recipe:", error);
    return { success: false, error: "Erreur lors de la modification de la recette" };
  }
}

export async function deleteRecipe(id: number): Promise<ActionResult> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { success: false, error: "Vous devez être connecté pour supprimer une recette" };
    }

    // Get user and recipe
    const [user, recipe] = await Promise.all([
      db.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
      db.recipe.findUnique({ where: { id }, select: { userId: true } }),
    ]);

    if (!user || !recipe) {
      return { success: false, error: "Utilisateur ou recette non trouvé" };
    }

    // Check permissions: must be owner or admin
    const isOwner = recipe.userId === session.user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Vous n'avez pas la permission de supprimer cette recette" };
    }

    await db.recipe.delete({ where: { id } });
    revalidatePath("/recipes");
    revalidatePath("/profile/recipes");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete recipe:", error);
    return { success: false, error: "Erreur lors de la suppression de la recette" };
  }
}
