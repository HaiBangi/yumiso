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
    const validation = recipeCreateSchema.safeParse(input);

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const { ingredients, steps, ...recipeData } = validation.data;

    // Get user's pseudo if authenticated and author is not explicitly set
    let authorName = recipeData.author;
    if (session?.user?.id && (!authorName || authorName === "Anonyme")) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { pseudo: true },
      });
      authorName = user?.pseudo || "Anonyme";
    }

    const recipe = await db.recipe.create({
      data: {
        ...recipeData,
        author: authorName || "Anonyme",
        // Link recipe to user if authenticated
        ...(session?.user?.id && { userId: session.user.id }),
        ingredients: { create: ingredients },
        steps: { create: steps },
      },
    });

    revalidatePath("/recipes");
    revalidatePath("/profile/recipes");
    return { success: true, data: { id: recipe.id } };
  } catch (error) {
    console.error("Failed to create recipe:", error);
    return { success: false, error: "Failed to create recipe" };
  }
}

export async function updateRecipe(
  id: number,
  input: Partial<RecipeCreateInput>
): Promise<ActionResult> {
  try {
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
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update recipe:", error);
    return { success: false, error: "Failed to update recipe" };
  }
}

export async function deleteRecipe(id: number): Promise<ActionResult> {
  try {
    await db.recipe.delete({ where: { id } });
    revalidatePath("/recipes");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete recipe:", error);
    return { success: false, error: "Failed to delete recipe" };
  }
}
