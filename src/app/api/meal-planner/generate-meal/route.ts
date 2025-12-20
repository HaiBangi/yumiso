import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseGPTJson } from "@/lib/chatgpt-helpers";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, dayOfWeek, timeSlot, mealType, prompt } = body;

    // Récupérer le plan pour connaître le nombre de personnes
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    const aiPrompt = `Génère une recette pour "${prompt}".

**Contraintes :**
- Type de repas : ${mealType}
- Pour ${plan.numberOfPeople} personnes
- Format JSON STRICT :
{
  "name": "Nom du plat",
  "prepTime": 15,
  "cookTime": 30,
  "servings": ${plan.numberOfPeople},
  "calories": 450,
  "ingredients": ["ingrédient 1", "ingrédient 2"],
  "steps": ["étape 1", "étape 2"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un chef cuisinier expert. Tu génères des recettes en JSON valide uniquement, sans texte avant ou après.",
        },
        {
          role: "user",
          content: aiPrompt,
        },
      ],
      temperature: 1,
      max_completion_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    const recipeData = parseGPTJson(content);

    // Créer le repas
    const meal = await db.plannedMeal.create({
      data: {
        weeklyMealPlanId: planId,
        dayOfWeek,
        timeSlot,
        mealType,
        name: recipeData.name,
        prepTime: recipeData.prepTime || 0,
        cookTime: recipeData.cookTime || 0,
        servings: recipeData.servings || plan.numberOfPeople,
        calories: recipeData.calories || null,
        portionsUsed: recipeData.servings || 1,
        ingredients: recipeData.ingredients || [],
        steps: recipeData.steps || [],
        isUserRecipe: false,
      },
    });

    return NextResponse.json(meal);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la génération" },
      { status: 500 }
    );
  }
}
