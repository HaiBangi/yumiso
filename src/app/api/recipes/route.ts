import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipeCreateSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/slug-helpers";
import { requireAuth, checkRateLimit, rateLimitResponse, validateContentType } from "@/lib/api-security";

// GET /api/recipes - Get all recipes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const recipes = await db.recipe.findMany({
      where: {
        deletedAt: null, // Exclure les recettes soft-deleted
        ...(category ? { category } : {}),
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Failed to fetch recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { session } = authResult;
    
    // 2. Rate limiting (max 20 recettes par minute par utilisateur)
    if (!checkRateLimit(`recipe-create-${session.user.id}`, 20, 60000)) {
      return rateLimitResponse();
    }
    
    // 3. Valider Content-Type
    if (!validateContentType(request)) {
      return NextResponse.json(
        { error: "Content-Type doit être application/json" },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const validation = recipeCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { ingredients, steps, ingredientGroups, ...recipeData } = validation.data;

    // Générer un slug unique pour le SEO
    const slug = await generateUniqueSlug(recipeData.name);

    // Create the recipe first (without groups and ingredients)
    const { costEstimate, ...baseRecipeData } = recipeData;
    const recipe = await db.recipe.create({
      data: {
        ...baseRecipeData,
        slug,
        ...(costEstimate && { costEstimate }),
        steps: {
          create: steps,
        },
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
      // Create simple ingredients (no groups) for backwards compatibility
      await db.ingredient.createMany({
        data: ingredients.map((ing, index) => ({
          ...ing,
          order: index,
          recipeId: recipe.id,
        })),
      });
    }

    // Fetch the created recipe with all relations
    const fullRecipe = await db.recipe.findUnique({
      where: { id: recipe.id },
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

    return NextResponse.json(fullRecipe, { status: 201 });
  } catch (error) {
    console.error("Failed to create recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
