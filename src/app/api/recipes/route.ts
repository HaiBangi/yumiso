import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipeCreateSchema } from "@/lib/validations";

// GET /api/recipes - Get all recipes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const recipes = await db.recipe.findMany({
      where: category ? { category } : undefined,
      include: {
        ingredients: true,
        steps: { orderBy: { order: "asc" } },
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
    const body = await request.json();
    const validation = recipeCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { ingredients, steps, ingredientGroups, ...recipeData } = validation.data;

    // Créer la recette d'abord (sans les groupes et ingrédients)
    const { costEstimate, ...baseRecipeData } = recipeData;
    const recipe = await db.recipe.create({
      data: {
        ...baseRecipeData,
        ...(costEstimate && { costEstimate }),
        steps: {
          create: steps,
        },
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
        steps: { orderBy: { order: "asc" } },
      },
    });

    // Créer les groupes d'ingrédients
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

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Failed to create recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}

