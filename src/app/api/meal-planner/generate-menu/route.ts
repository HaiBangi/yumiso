import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const MEAL_TYPE_MAP: Record<string, { time: string; label: string }> = {
  breakfast: { time: "08:00", label: "Petit-déjeuner" },
  lunch: { time: "12:00", label: "Déjeuner" },
  snack: { time: "16:00", label: "Collation" },
  dinner: { time: "19:00", label: "Dîner" },
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const {
      planId,
      numberOfPeople,
      mealTypes = [],
      cuisinePreferences = [],
      preferences = "",
      budget = "moyen",
      useExistingRecipes = false,
    } = body;

    console.log("🤖 Génération de menu:", { planId, numberOfPeople, mealTypes, cuisinePreferences });

    // Récupérer les recettes existantes si demandé
    let existingRecipes: any[] = [];
    if (useExistingRecipes) {
      existingRecipes = await db.recipe.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          name: true,
          category: true,
          preparationTime: true,
          cookingTime: true,
          servings: true,
        },
        take: 50,
      });
    }

    // Construire le prompt pour ChatGPT
    const selectedMealLabels = mealTypes.map((m: string) => MEAL_TYPE_MAP[m]?.label).filter(Boolean);
    const selectedMealTimings = mealTypes.map((m: string) => `${MEAL_TYPE_MAP[m]?.label} (${MEAL_TYPE_MAP[m]?.time})`).filter(Boolean);
    
    const prompt = `Génère un menu de repas pour une semaine complète.

**Contraintes:**
- Nombre de personnes: ${numberOfPeople}
- Types de repas à générer: **UNIQUEMENT** ${selectedMealLabels.join(", ")} - NE GÉNÈRE AUCUN AUTRE TYPE DE REPAS
- Créneaux horaires: ${selectedMealTimings.join(", ")}
- Budget: ${budget}
${cuisinePreferences.length > 0 ? `- Cuisines préférées: ${cuisinePreferences.join(", ")}` : ""}
${preferences ? `- Autres informations: ${preferences}` : ""}

**TRÈS IMPORTANT:**
- Génère EXACTEMENT ${mealTypes.length * 7} repas au total (${mealTypes.length} par jour × 7 jours)
- NE génère QUE les types de repas demandés: ${selectedMealLabels.join(", ")}
- N'ajoute PAS de petit-déjeuner si ce n'est pas demandé
- N'ajoute PAS de collation si ce n'est pas demandé
- Varie les recettes pour éviter la répétition
- Une recette peut servir plusieurs repas (ex: un plat pour 4 portions peut couvrir 2 repas)
${existingRecipes.length > 0 ? `- Voici des recettes existantes que tu peux utiliser:\n${existingRecipes.map(r => `  * ${r.name}`).join("\n")}` : ""}

**Format JSON strict (UNIQUEMENT du JSON, pas de texte avant ou après):**
{
  "meals": [
    {
      "dayOfWeek": "Lundi|Mardi|...",
      "timeSlot": "08:00|12:00|16:00|19:00",
      "mealType": "Petit-déjeuner|Déjeuner|Collation|Dîner",
      "name": "Nom du plat",
      "prepTime": 15,
      "cookTime": 30,
      "servings": ${numberOfPeople},
      "calories": 450,
      "ingredients": ["2 tasses farine", "3 œufs", "..."],
      "steps": ["Étape 1", "Étape 2", "..."]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un chef cuisinier expert en planification de menus. Tu génères UNIQUEMENT du JSON valide, sans texte explicatif avant ou après.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_completion_tokens: 15000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    console.log("📝 Réponse ChatGPT:", content.substring(0, 200));

    const menuData = JSON.parse(content);

    // Créer tous les repas dans la base de données
    const createdMeals = [];
    for (const meal of menuData.meals) {
      // Pour le moment, on ne lie pas aux recettes existantes pour éviter les erreurs de clé étrangère
      // On crée juste les repas comme des recettes générées par l'IA
      const createdMeal = await db.plannedMeal.create({
        data: {
          weeklyMealPlanId: planId,
          dayOfWeek: meal.dayOfWeek,
          timeSlot: meal.timeSlot,
          mealType: meal.mealType,
          name: meal.name,
          prepTime: meal.prepTime || 0,
          cookTime: meal.cookTime || 0,
          servings: meal.servings || numberOfPeople,
          calories: meal.calories || null,
          portionsUsed: meal.servings || numberOfPeople,
          ingredients: meal.ingredients || [],
          steps: meal.steps || [],
          recipeId: null, // Toujours null pour éviter les violations de contrainte
          isUserRecipe: false,
        },
      });
      createdMeals.push(createdMeal);
    }

    console.log("✅ Menu généré avec succès:", createdMeals.length, "repas");

    return NextResponse.json({
      success: true,
      mealsCreated: createdMeals.length,
    });
  } catch (error) {
    console.error("❌ Erreur génération menu:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du menu",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
