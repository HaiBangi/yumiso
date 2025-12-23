"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { recipeCreateSchema, recipeUpdateSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/slug-helpers";
import type { RecipeCreateInput } from "@/lib/validations";

export type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false, error: string };

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

    const { ingredients, steps, ingredientGroups, ...recipeData } = validation.data;

    // Get user's pseudo if author is not explicitly set
    let authorName = recipeData.author;
    if (!authorName || authorName === "") {
      authorName = user.pseudo || "Anonyme";
    }

    // Générer un slug unique pour le SEO
    const slug = await generateUniqueSlug(recipeData.name);

    // Créer la recette d'abord (sans les groupes et ingrédients)
    const { costEstimate, ...baseRecipeData } = recipeData;
    const recipe = await db.recipe.create({
      data: {
        ...baseRecipeData,
        slug,
        ...(costEstimate && { costEstimate }),
        author: authorName,
        userId: session.user.id,
        steps: { create: steps },
      },
    });

    // Ensuite créer les groupes d'ingrédients et leurs ingrédients
    if (ingredientGroups && ingredientGroups.length > 0) {
      for (let i = 0; i < ingredientGroups.length; i++) {
        const group = ingredientGroups[i];
        await db.ingredientGroup.create({
          data: {
            name: group.name,
            order: i,
            recipeId: recipe.id,
            ingredients: {
              create: group.ingredients.map((ing, ingIndex) => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                order: ingIndex,
                recipeId: recipe.id,
              })),
            },
          },
        });
      }
    } else if (ingredients && ingredients.length > 0) {
      // Rétrocompatibilité : créer les ingrédients sans groupe
      await db.ingredient.createMany({
        data: ingredients.map((ing, index) => ({
          ...ing,
          order: index,
          recipeId: recipe.id,
        })),
      });
    }

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
    const isAdmin = user.role === "ADMIN" || user.role === "OWNER";

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Vous n'avez pas la permission de modifier cette recette" };
    }

    const validation = recipeUpdateSchema.safeParse(input);

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const { ingredients, steps, ingredientGroups, ...recipeData } = validation.data;

    // Delete existing related records first
    if (ingredients || ingredientGroups) {
      // Supprimer tous les groupes et ingrédients existants
      await db.ingredientGroup.deleteMany({ where: { recipeId: id } });
      await db.ingredient.deleteMany({ where: { recipeId: id } });
    }
    if (steps) {
      await db.step.deleteMany({ where: { recipeId: id } });
    }

    // Update the recipe (sans les groupes et ingrédients)
    const { costEstimate, ...baseRecipeData } = recipeData;
    await db.recipe.update({
      where: { id },
      data: {
        ...baseRecipeData,
        ...(costEstimate !== undefined && { costEstimate }),
        ...(steps && { steps: { create: steps } }),
      },
    });

    // Créer les nouveaux groupes d'ingrédients
    if (ingredientGroups && ingredientGroups.length > 0) {
      for (let i = 0; i < ingredientGroups.length; i++) {
        const group = ingredientGroups[i];
        await db.ingredientGroup.create({
          data: {
            name: group.name,
            order: i,
            recipeId: id,
            ingredients: {
              create: group.ingredients.map((ing, ingIndex) => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                order: ingIndex,
                recipeId: id,
              })),
            },
          },
        });
      }
    } else if (ingredients && ingredients.length > 0) {
      // Rétrocompatibilité : créer les ingrédients sans groupe
      await db.ingredient.createMany({
        data: ingredients.map((ing, index) => ({
          ...ing,
          order: index,
          recipeId: id,
        })),
      });
    }

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

    console.log("[deleteRecipe] Session user ID:", session?.user?.id);
    console.log("[deleteRecipe] Recipe ID to delete:", id);

    if (!session?.user?.id) {
      return { success: false, error: "Vous devez être connecté pour supprimer une recette" };
    }

    // Get user and recipe
    const [user, recipe] = await Promise.all([
      db.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
      db.recipe.findUnique({ where: { id }, select: { userId: true } }),
    ]);

    console.log("[deleteRecipe] User role:", user?.role);
    console.log("[deleteRecipe] Recipe userId:", recipe?.userId);

    if (!user || !recipe) {
      console.log("[deleteRecipe] User or recipe not found");
      return { success: false, error: "Utilisateur ou recette non trouvé" };
    }

    // Check permissions: must be owner or admin
    const isOwner = recipe.userId === session.user.id;
    const isAdmin = user.role === "ADMIN" || user.role === "OWNER";

    console.log("[deleteRecipe] isOwner:", isOwner, "isAdmin:", isAdmin);

    if (!isOwner && !isAdmin) {
      console.log("[deleteRecipe] Permission denied");
      return { success: false, error: "Vous n'avez pas la permission de supprimer cette recette" };
    }

    // Soft delete - marquer comme supprimé au lieu de supprimer définitivement
    await db.recipe.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    console.log("[deleteRecipe] Recipe soft-deleted successfully");
    revalidatePath("/recipes");
    revalidatePath("/profile/recipes");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete recipe:", error);
    return { success: false, error: "Erreur lors de la suppression de la recette" };
  }
}

export async function deleteMultipleRecipes(ids: number[]): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Vous devez être connecté pour supprimer des recettes" };
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
      return { success: false, error: "Seuls les administrateurs peuvent supprimer plusieurs recettes" };
    }

    // Soft delete all recipes with the given IDs
    const result = await db.recipe.updateMany({
      where: {
        id: {
          in: ids
        }
      },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/recipes");
    revalidatePath("/profile/recipes");
    revalidatePath("/admin");

    return { success: true, data: { count: result.count } };
  } catch (error) {
    console.error("Failed to delete recipes:", error);
    return { success: false, error: "Erreur lors de la suppression des recettes" };
  }
}

/**
 * Restaurer une recette soft-deleted (admin uniquement)
 */
export async function restoreRecipe(id: number): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
      return { success: false, error: "Seuls les administrateurs peuvent restaurer des recettes" };
    }

    await db.recipe.update({
      where: { id },
      data: { deletedAt: null },
    });

    revalidatePath("/recipes");
    revalidatePath("/profile/recipes");
    revalidatePath("/admin");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to restore recipe:", error);
    return { success: false, error: "Erreur lors de la restauration de la recette" };
  }
}

/**
 * Lister les recettes supprimées (admin uniquement)
 */
export async function getDeletedRecipes(): Promise<ActionResult<{
  id: number;
  name: string;
  category: string;
  deletedAt: Date | null;
  author: string;
}[]>> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Vous devez être connecté" };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
      return { success: false, error: "Seuls les administrateurs peuvent voir les recettes supprimées" };
    }

    const recipes = await db.recipe.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        name: true,
        category: true,
        deletedAt: true,
        author: true,
      },
      orderBy: { deletedAt: "desc" },
      take: 50,
    });

    return { success: true, data: recipes };
  } catch (error) {
    console.error("Failed to get deleted recipes:", error);
    return { success: false, error: "Erreur lors de la récupération des recettes supprimées" };
  }
}