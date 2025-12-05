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

    const { ingredients, steps, ...recipeData } = validation.data;

    const recipe = await db.recipe.create({
      data: {
        ...recipeData,
        ingredients: {
          create: ingredients,
        },
        steps: {
          create: steps,
        },
      },
      include: {
        ingredients: true,
        steps: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Failed to create recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}

