import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, dayOfWeek, timeSlot, mealType, recipeId, portionsUsed: _portionsUsed } = body;

    // Vérifier les permissions sur le plan
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      include: {
        contributors: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur est soit le propriétaire, soit un contributeur
    const isOwner = plan.userId === session.user.id;
    const isContributor = plan.contributors.some(c => c.role === "CONTRIBUTOR");

    if (!isOwner && !isContributor) {
      return NextResponse.json(
        { error: "Non autorisé - Seuls les propriétaires et contributeurs peuvent ajouter des repas" },
        { status: 403 }
      );
    }

    // Si c'est une recette existante
    if (recipeId) {
      const recipe = await db.recipe.findUnique({
        where: {
          id: recipeId,
          deletedAt: null,
        },
        include: {
          ingredients: true,
          steps: { orderBy: { order: "asc" } },
        },
      });

      if (!recipe) {
        return NextResponse.json({ error: "Recette non trouvée" }, { status: 404 });
      }

      // Formater les ingrédients SANS ajustement (utiliser les quantités exactes de la recette)
      const ingredientsFormatted = recipe.ingredients.map((ing) => {
        if (ing.quantity && ing.unit) {
          return `${ing.quantity} ${ing.unit} ${ing.name}`;
        } else if (ing.quantity) {
          return `${ing.quantity} ${ing.name}`;
        } else {
          return ing.name;
        }
      });

      const meal = await db.plannedMeal.create({
        data: {
          weeklyMealPlanId: planId,
          dayOfWeek,
          timeSlot,
          mealType,
          name: recipe.name,
          prepTime: recipe.preparationTime,
          cookTime: recipe.cookingTime,
          servings: recipe.servings, // Utiliser les portions de la recette d'origine
          calories: recipe.caloriesPerServing, // Utiliser les calories exactes (sans multiplication)
          portionsUsed: recipe.servings, // Garder le nombre de portions de la recette
          ingredients: ingredientsFormatted,
          steps: recipe.steps.map((step) => step.text),
          recipeId: recipe.id,
          isUserRecipe: true,
        },
      });

      return NextResponse.json(meal);
    }

    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  } catch (error) {
    console.error("❌ Erreur complète lors de l'ajout du repas:");
    console.error(error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    return NextResponse.json(
      { 
        error: "Erreur lors de l'ajout du repas",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mealId = searchParams.get("id");

    if (!mealId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    // Récupérer le repas pour vérifier les permissions
    const meal = await db.plannedMeal.findUnique({
      where: { id: parseInt(mealId) },
      include: {
        weeklyMealPlan: {
          include: {
            contributors: {
              where: {
                userId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: "Repas non trouvé" }, { status: 404 });
    }

    // Vérifier que l'utilisateur est soit le propriétaire, soit un contributeur
    const isOwner = meal.weeklyMealPlan.userId === session.user.id;
    const isContributor = meal.weeklyMealPlan.contributors.some(c => c.role === "CONTRIBUTOR");

    if (!isOwner && !isContributor) {
      return NextResponse.json(
        { error: "Non autorisé - Seuls les propriétaires et contributeurs peuvent supprimer des repas" },
        { status: 403 }
      );
    }

    await db.plannedMeal.delete({
      where: { id: parseInt(mealId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
