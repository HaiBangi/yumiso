import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipeUpdateSchema } from "@/lib/validations";
import { requireAuth, requireOwnerOrAdmin, validateNumericId, checkRateLimit, rateLimitResponse } from "@/lib/api-security";

type RouteContext = { params: Promise<{ id: string }> };

// Helper function to find recipe by ID or slug
async function findRecipe(idOrSlug: string) {
  const recipeId = parseInt(idOrSlug, 10);
  
  // Try finding by ID first if it's a valid number
  if (!isNaN(recipeId)) {
    const recipe = await db.recipe.findFirst({
      where: {
        id: recipeId,
        deletedAt: null,
      },
      include: {
        ingredients: {
          orderBy: { order: "asc" },
        },
        ingredientGroups: {
          include: {
            ingredients: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
        steps: {
          orderBy: { order: "asc" },
        },
      },
    });
    
    if (recipe) return recipe;
  }
  
  // If not found by ID or idOrSlug is not a number, try finding by slug
  return db.recipe.findFirst({
    where: {
      slug: idOrSlug,
      deletedAt: null,
    },
    include: {
      ingredients: {
        orderBy: { order: "asc" },
      },
      ingredientGroups: {
        include: {
          ingredients: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      steps: {
        orderBy: { order: "asc" },
      },
    },
  });
}

// GET /api/recipes/[id] - Get a single recipe by ID or slug
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const recipe = await findRecipe(id);

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Failed to fetch recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

// PUT /api/recipes/[id] - Update a recipe
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentification requise
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { session } = authResult;
    
    const { id } = await context.params;
    
    // 2. Validation de l'ID
    const validationResult = validateNumericId(id, "Recipe ID");
    if (validationResult instanceof NextResponse) {
      return validationResult;
    }
    const recipeId = validationResult;
    
    // 3. Rate limiting
    if (!checkRateLimit(`recipe-update-${session.user.id}`, 30, 60000)) {
      return rateLimitResponse();
    }
    
    // 4. Vérifier que la recette existe
    const existingRecipe = await db.recipe.findUnique({
      where: { id: recipeId },
      select: { userId: true, deletedAt: true },
    });
    
    if (!existingRecipe || existingRecipe.deletedAt) {
      return NextResponse.json({ error: "Recette non trouvée" }, { status: 404 });
    }
    
    if (!existingRecipe.userId) {
      return NextResponse.json({ error: "Recette sans propriétaire" }, { status: 400 });
    }
    
    // 5. Vérifier que l'utilisateur est propriétaire ou admin
    const ownerCheck = await requireOwnerOrAdmin(request, existingRecipe.userId);
    if (ownerCheck instanceof NextResponse) {
      return ownerCheck;
    }

    const body = await request.json();
    const validation = recipeUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { ingredients, steps, ingredientGroups, ...recipeData } = validation.data;

    // Delete existing ingredients, groups and steps if new ones are provided
    if (ingredients || ingredientGroups) {
      await db.ingredientGroup.deleteMany({ where: { recipeId } });
      await db.ingredient.deleteMany({ where: { recipeId } });
    }
    if (steps) {
      await db.step.deleteMany({ where: { recipeId } });
    }

    // Update the recipe
    const { costEstimate, ...baseRecipeData } = recipeData;
    await db.recipe.update({
      where: { id: recipeId },
      data: {
        ...baseRecipeData,
        ...(costEstimate !== undefined && { costEstimate }),
        ...(steps && {
          steps: { create: steps },
        }),
      },
    });

    // Create ingredient groups if provided
    if (ingredientGroups && ingredientGroups.length > 0) {
      for (let i = 0; i < ingredientGroups.length; i++) {
        const group = ingredientGroups[i];
        await db.ingredientGroup.create({
          data: {
            name: group.name,
            order: i,
            recipeId,
            ingredients: {
              create: group.ingredients.map((ing, ingIndex) => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                order: ingIndex,
                recipeId,
              })),
            },
          },
        });
      }
    } else if (ingredients && ingredients.length > 0) {
      // Create simple ingredients (no groups)
      await db.ingredient.createMany({
        data: ingredients.map((ing, index) => ({
          ...ing,
          order: index,
          recipeId,
        })),
      });
    }

    // Fetch the updated recipe
    const updatedRecipe = await db.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          orderBy: { order: "asc" },
        },
        ingredientGroups: {
          include: {
            ingredients: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
        steps: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    console.error("Failed to update recipe:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

// DELETE /api/recipes/[id] - Delete a recipe
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentification requise
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { session } = authResult;
    
    const { id } = await context.params;
    
    // 2. Validation de l'ID
    const validationResult = validateNumericId(id, "Recipe ID");
    if (validationResult instanceof NextResponse) {
      return validationResult;
    }
    const recipeId = validationResult;
    
    // 3. Rate limiting
    if (!checkRateLimit(`recipe-delete-${session.user.id}`, 10, 60000)) {
      return rateLimitResponse();
    }

    // 4. Vérifier que la recette existe et récupérer le userId
    const existingRecipe = await db.recipe.findUnique({
      where: { id: recipeId },
      select: { userId: true, deletedAt: true },
    });
    
    if (!existingRecipe || existingRecipe.deletedAt) {
      return NextResponse.json({ error: "Recette non trouvée" }, { status: 404 });
    }
    
    if (!existingRecipe.userId) {
      return NextResponse.json({ error: "Recette sans propriétaire" }, { status: 400 });
    }
    
    // 5. Vérifier que l'utilisateur est propriétaire ou admin
    const ownerCheck = await requireOwnerOrAdmin(request, existingRecipe.userId);
    if (ownerCheck instanceof NextResponse) {
      return ownerCheck;
    }

    // 6. Suppression (soft delete)
    await db.recipe.update({
      where: { id: recipeId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: "Recette supprimée avec succès" });
  } catch (error) {
    console.error("Failed to delete recipe:", error);
    return NextResponse.json(
      { error: "Échec de la suppression de la recette" },
      { status: 500 }
    );
  }
}