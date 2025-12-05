import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipeUpdateSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/recipes/[id] - Get a single recipe
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const recipe = await db.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
        steps: { orderBy: { order: "asc" } },
      },
    });

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
    const { id } = await context.params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const body = await request.json();
    const validation = recipeUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { ingredients, steps, ...recipeData } = validation.data;

    // Check if recipe exists
    const existing = await db.recipe.findUnique({ where: { id: recipeId } });
    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Delete existing ingredients and steps if new ones are provided
    if (ingredients) {
      await db.ingredient.deleteMany({ where: { recipeId } });
    }
    if (steps) {
      await db.step.deleteMany({ where: { recipeId } });
    }

    // Update the recipe
    const recipe = await db.recipe.update({
      where: { id: recipeId },
      data: {
        ...recipeData,
        ...(ingredients && {
          ingredients: { create: ingredients },
        }),
        ...(steps && {
          steps: { create: steps },
        }),
      },
      include: {
        ingredients: true,
        steps: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json(recipe);
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
    const { id } = await context.params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const existing = await db.recipe.findUnique({ where: { id: recipeId } });
    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    await db.recipe.delete({ where: { id: recipeId } });

    return NextResponse.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.error("Failed to delete recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
