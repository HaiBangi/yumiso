import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseGPTJson } from "@/lib/chatgpt-helpers";

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
      recipeMode = "mix", // "new", "existing", ou "mix"
      includeRecipes = [], // IDs des recettes à inclure obligatoirement
    } = body;

    console.log("🤖 Génération de menu:", { planId, numberOfPeople, mealTypes, cuisinePreferences, recipeMode, includeRecipes });

    // Récupérer les recettes existantes si le mode le permet
    let existingRecipes: any[] = [];
    if (recipeMode === "existing" || recipeMode === "mix") {
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

    // Récupérer les recettes spécifiquement demandées
    let includedRecipes: any[] = [];
    if (includeRecipes.length > 0) {
      includedRecipes = await db.recipe.findMany({
        where: {
          id: { in: includeRecipes },
          userId: session.user.id,
        },
        select: {
          id: true,
          name: true,
          category: true,
          preparationTime: true,
          cookingTime: true,
          servings: true,
        },
      });
    }

    // Construire le prompt pour ChatGPT
    const selectedMealLabels = mealTypes.map((m: string) => MEAL_TYPE_MAP[m]?.label).filter(Boolean);
    const selectedMealTimings = mealTypes.map((m: string) => `${MEAL_TYPE_MAP[m]?.label} (${MEAL_TYPE_MAP[m]?.time})`).filter(Boolean);
    
    // Instructions selon le mode
    let modeInstructions = "";
    if (recipeMode === "new") {
      modeInstructions = "- Génère UNIQUEMENT de nouvelles recettes créatives";
    } else if (recipeMode === "existing") {
      modeInstructions = "- Utilise UNIQUEMENT les recettes existantes listées ci-dessous";
    } else {
      modeInstructions = "- Combine les recettes existantes ET de nouvelles suggestions créatives";
    }
    
    const prompt = `Génère un menu de repas pour une semaine complète.

**Contraintes:**
- Nombre de personnes: ${numberOfPeople}
- Types de repas à générer: **UNIQUEMENT** ${selectedMealLabels.join(", ")} - NE GÉNÈRE AUCUN AUTRE TYPE DE REPAS
- Créneaux horaires: ${selectedMealTimings.join(", ")}
${cuisinePreferences.length > 0 ? `- Cuisines préférées: ${cuisinePreferences.join(", ")}` : ""}
${preferences ? `- Autres informations: ${preferences}` : ""}
${includedRecipes.length > 0 ? `\n**RECETTES À INCLURE OBLIGATOIREMENT:**\n${includedRecipes.map((r: any) => `  * ${r.name}`).join("\n")}` : ""}

**MODE DE GÉNÉRATION:**
${modeInstructions}
${existingRecipes.length > 0 && (recipeMode === "existing" || recipeMode === "mix") ? `\n**Recettes existantes disponibles:**\n${existingRecipes.map((r: any) => `  * ${r.name}`).join("\n")}` : ""}

**TRÈS IMPORTANT:**
- Génère EXACTEMENT ${mealTypes.length * 7} repas au total (${mealTypes.length} par jour × 7 jours)
- NE génère QUE les types de repas demandés: ${selectedMealLabels.join(", ")}
- N'ajoute PAS de petit-déjeuner si ce n'est pas demandé
- N'ajoute PAS de collation si ce n'est pas demandé
- Varie les recettes pour éviter la répétition
- Une recette peut servir plusieurs repas (ex: un plat pour 4 portions peut couvrir 2 repas)
${includedRecipes.length > 0 ? `- IMPORTANT: Inclus OBLIGATOIREMENT ces recettes dans le menu: ${includedRecipes.map((r: any) => r.name).join(", ")}` : ""}

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
      model: "gpt-5-mini",
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
      temperature: 1,
      max_completion_tokens: 20000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    console.log("📝 Réponse ChatGPT:", content.substring(0, 200));

    const menuData = parseGPTJson(content);

    // Créer tous les repas dans la base de données
    const createdMeals = [];
    for (const meal of menuData.meals) {
      // Chercher si une recette avec le même nom existe déjà (seulement si mode "existing" ou "mix")
      let matchingRecipe = null;
      if (recipeMode === "existing" || recipeMode === "mix") {
        matchingRecipe = await db.recipe.findFirst({
          where: {
            userId: session.user.id,
            name: {
              equals: meal.name,
              mode: 'insensitive', // Insensible à la casse
            },
          },
          include: {
            ingredients: true,
            steps: { orderBy: { order: "asc" } },
          },
        });
      }

      let mealData;
      
      if (matchingRecipe) {
        // Utiliser la recette existante
        console.log(`✅ Recette existante trouvée: ${matchingRecipe.name}`);
        
        // Calculer le ratio d'ajustement des portions
        const portionRatio = numberOfPeople / matchingRecipe.servings;

        // Formater les ingrédients avec quantités ajustées
        const ingredientsFormatted = matchingRecipe.ingredients.map((ing) => {
          let adjustedQuantity = ing.quantity;
          if (adjustedQuantity && portionRatio !== 1) {
            adjustedQuantity = Math.round((adjustedQuantity * portionRatio) * 100) / 100;
          }

          if (adjustedQuantity && ing.unit) {
            return `${adjustedQuantity} ${ing.unit} ${ing.name}`;
          } else if (adjustedQuantity) {
            return `${adjustedQuantity} ${ing.name}`;
          } else {
            return ing.name;
          }
        });

        mealData = {
          weeklyMealPlanId: planId,
          dayOfWeek: meal.dayOfWeek,
          timeSlot: meal.timeSlot,
          mealType: meal.mealType,
          name: matchingRecipe.name,
          prepTime: matchingRecipe.preparationTime,
          cookTime: matchingRecipe.cookingTime,
          servings: numberOfPeople,
          calories: matchingRecipe.caloriesPerServing ? Math.round(matchingRecipe.caloriesPerServing * portionRatio) : null,
          portionsUsed: numberOfPeople,
          ingredients: ingredientsFormatted,
          steps: matchingRecipe.steps.map((step) => step.text),
          recipeId: matchingRecipe.id,
          isUserRecipe: true,
        };
      } else {
        // Utiliser les données générées par l'IA
        mealData = {
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
          recipeId: null,
          isUserRecipe: false,
        };
      }

      const createdMeal = await db.plannedMeal.create({ data: mealData });
      createdMeals.push(createdMeal);
    }

    console.log("✅ Menu généré avec succès:", createdMeals.length, "repas");

    return NextResponse.json({
      success: true,
      mealsCreated: createdMeals.length,
    });
  } catch (error) {
    console.error("❌ Erreur génération menu:", error);
    
    // Extraire les détails de l'erreur
    let errorMessage = "Erreur inconnue";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
      
      // Si c'est une erreur OpenAI, extraire plus de détails
      if ('response' in error) {
        const openAIError = error as any;
        errorDetails = JSON.stringify({
          message: openAIError.message,
          type: openAIError.type,
          code: openAIError.code,
          status: openAIError.status,
          response: openAIError.response?.data || openAIError.response
        }, null, 2);
      }
    }
    
    console.error("📋 Détails complets de l'erreur:", errorDetails);
    
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du menu",
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}