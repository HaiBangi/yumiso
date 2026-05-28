import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseGPTJson } from "@/lib/chatgpt-helpers";
import { checkUserPremium } from "@/lib/premium";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifiÃ©" }, { status: 401 });
    }

    // VÃ©rifier que l'utilisateur est Premium
    const { isPremium } = await checkUserPremium(session.user.id);
    if (!isPremium) {
      return NextResponse.json(
        { error: "Cette fonctionnalitÃ© nÃ©cessite un abonnement Premium" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      numberOfPeople,
      budget,
      cookingTime,
      mealTypes,
      cuisinePreferences,
      useMyRecipes,
    } = body;

    let userRecipesContext = "";

    // Si l'utilisateur veut utiliser ses propres recettes
    if (useMyRecipes) {
      const userRecipes = await db.recipe.findMany({
        where: {
          userId: session.user.id,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          category: true,
          preparationTime: true,
          cookingTime: true,
          servings: true,
          ingredients: {
            select: {
              name: true,
              quantity: true,
              unit: true,
            },
          },
          steps: {
            select: {
              text: true,
              order: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
        take: 50,
      });

      if (userRecipes.length > 0) {
        userRecipesContext = `\n\nVoici les recettes personnelles de l'utilisateur que tu peux inclure dans le Planificateur de repas :\n${userRecipes.map(r => `- ID:${r.id} | ${r.name} (${r.category}, ${r.preparationTime + r.cookingTime}min, ${r.servings} portions)`).join('\n')}`;
      }
    }

    const prompt = `Tu es un expert en nutrition et planification de repas. GÃ©nÃ¨re un menu pour la semaine complet et dÃ©taillÃ©.

**Contraintes :**
- Nombre de personnes : ${numberOfPeople}
- Budget : ${budget}
- Temps de cuisine disponible : ${cookingTime}
- Types de repas : ${mealTypes.join(', ')}
${cuisinePreferences.length > 0 ? `- PrÃ©fÃ©rences culinaires : ${cuisinePreferences.join(', ')}` : ''}
${userRecipesContext}

**Instructions :**
1. CrÃ©e un menu pour 7 jours (Lundi Ã  Dimanche)
2. Pour chaque jour, inclus les repas demandÃ©s (${mealTypes.join(', ')})
3. Ã‰quilibre nutritionnel : varie les sources de protÃ©ines, lÃ©gumes, et fÃ©culents
4. Respecte STRICTEMENT toutes les contraintes (budget, temps)
5. Optimise pour rÃ©duire le gaspillage (rÃ©utilise des ingrÃ©dients)
6. Inclus des conseils pratiques (prÃ©paration Ã  l'avance, batch cooking)
${useMyRecipes ? '7. PRIVILÃ‰GIE les recettes personnelles de l\'utilisateur. Si tu utilises une recette de l\'utilisateur, mets son ID dans le champ recipeId' : ''}

**Format de rÃ©ponse (JSON STRICT) :**
{
  "weekPlan": [
    {
      "day": "Lundi",
      "meals": [
        {
          "type": "DÃ©jeuner",
          "name": "Nom du plat",
          "prepTime": 15,
          "cookTime": 30,
          "servings": ${numberOfPeople},
          "calories": 450,
          "ingredients": ["ingrÃ©dient 1", "ingrÃ©dient 2"],
          "steps": ["Ã©tape 1", "Ã©tape 2"],
          "isUserRecipe": false,
          "recipeId": null
        }
      ]
    }
  ],
  "shoppingList": {
    "LÃ©gumes": ["tomate x5", "oignon x3"],
    "Viandes": ["poulet 500g"],
    "Ã‰picerie": ["riz 1kg"]
  },
  "prepTips": [
    "Conseil 1",
    "Conseil 2"
  ],
  "estimatedCost": "45-60â‚¬",
  "nutritionSummary": {
    "avgCaloriesPerDay": 2000,
    "proteinGrams": 80,
    "carbsGrams": 250,
    "fatGrams": 70
  }
}

GÃ©nÃ¨re maintenant le menu complet en JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un expert nutritionniste et chef cuisinier. Tu gÃ©nÃ¨res des menus hebdomadaires Ã©quilibrÃ©s, variÃ©s et adaptÃ©s aux besoins. Tu rÃ©ponds UNIQUEMENT en JSON valide, sans texte avant ou aprÃ¨s.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_completion_tokens: 15000,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Pas de rÃ©ponse de ChatGPT");
    }

    // Parse le JSON
    let menuData;
    try {
      menuData = parseGPTJson(content);
    } catch (parseError) {
      console.error("Erreur de parsing JSON:", parseError);
      console.error("Contenu reÃ§u:", content);
      throw new Error("RÃ©ponse ChatGPT invalide (pas du JSON valide)");
    }

    // Valider la structure des donnÃ©es
    if (!menuData.weekPlan || !Array.isArray(menuData.weekPlan)) {
      console.error("Structure invalide - weekPlan manquant ou invalide:", menuData);
      throw new Error("Structure de menu invalide");
    }

    if (!menuData.nutritionSummary) {
      console.error("Structure invalide - nutritionSummary manquant:", menuData);
      throw new Error("RÃ©sumÃ© nutritionnel manquant");
    }

    console.log("âœ… DonnÃ©es validÃ©es, crÃ©ation du plan en base de donnÃ©es...");
    console.log(`   - ${menuData.weekPlan.length} jours`);
    console.log(`   - ${menuData.weekPlan.reduce((acc: number, day: any) => acc + day.meals.length, 0)} repas au total`);

    // Calculer les dates de la semaine (lundi au dimanche)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si dimanche (0), reculer de 6 jours, sinon aller au lundi
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Formater le nom de la semaine
    const weekName = `Semaine du ${monday.getDate()}/${monday.getMonth() + 1}/${monday.getFullYear()}`;

    // Sauvegarder le menu dans la base de donnÃ©es
    let savedMealPlan;
    try {
      console.log("ðŸ’¾ Sauvegarde du plan en base de donnÃ©es...");
      console.log("Structure des donnÃ©es reÃ§ues:", {
        hasWeekPlan: !!menuData.weekPlan,
        weekPlanLength: menuData.weekPlan?.length,
        firstDay: menuData.weekPlan?.[0],
      });

      // PrÃ©parer les donnÃ©es des repas
      const mealsData = menuData.weekPlan?.flatMap((day: any) => {
        if (!day || !day.meals || !Array.isArray(day.meals)) {
          console.warn(`Jour invalide ou sans repas:`, day);
          return [];
        }

        return day.meals.map((meal: any) => {
          const mealData = {
            dayOfWeek: day.day || "Inconnu",
            mealType: meal.type || "Repas",
            name: meal.name || "Sans nom",
            prepTime: parseInt(meal.prepTime) || 0,
            cookTime: parseInt(meal.cookTime) || 0,
            servings: parseInt(meal.servings) || numberOfPeople,
            calories: meal.calories ? parseInt(meal.calories) : null,
            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
            steps: Array.isArray(meal.steps) ? meal.steps : [],
            isUserRecipe: !!meal.isUserRecipe,
            recipeId: meal.recipeId ? parseInt(meal.recipeId) : null,
          };

          console.log(`Repas prÃ©parÃ©: ${mealData.dayOfWeek} - ${mealData.mealType} - ${mealData.name}`);
          return mealData;
        });
      }) || [];

      console.log(`ðŸ“Š Total de ${mealsData.length} repas Ã  crÃ©er`);

      if (mealsData.length === 0) {
        throw new Error("Aucun repas valide dans le menu gÃ©nÃ©rÃ©");
      }

      savedMealPlan = await db.weeklyMealPlan.create({
        data: {
          name: weekName,
          weekStart: monday,
          weekEnd: sunday,
          numberOfPeople: parseInt(numberOfPeople),
          budget: budget,
          cookingTime: cookingTime,
          mealTypes: mealTypes,
          cuisinePreferences: cuisinePreferences || [],
          avgCaloriesPerDay: menuData.nutritionSummary?.avgCaloriesPerDay ? parseInt(menuData.nutritionSummary.avgCaloriesPerDay) : null,
          proteinGrams: menuData.nutritionSummary?.proteinGrams ? parseInt(menuData.nutritionSummary.proteinGrams) : null,
          carbsGrams: menuData.nutritionSummary?.carbsGrams ? parseInt(menuData.nutritionSummary.carbsGrams) : null,
          fatGrams: menuData.nutritionSummary?.fatGrams ? parseInt(menuData.nutritionSummary.fatGrams) : null,
          estimatedCost: menuData.estimatedCost || null,
          prepTips: Array.isArray(menuData.prepTips) ? menuData.prepTips : [],
          userId: session.user.id,
          meals: {
            create: mealsData,
          },
        },
        include: {
          meals: true,
        },
      });

      console.log(`âœ… Plan sauvegardÃ© avec l'ID: ${savedMealPlan.id}`);
      console.log(`   - ${savedMealPlan.meals.length} repas crÃ©Ã©s`);

      // CrÃ©er automatiquement la liste de courses associÃ©e
      console.log("ðŸ›’ CrÃ©ation de la liste de courses...");
      await db.shoppingList.create({
        data: {
          name: `Liste de Courses - ${savedMealPlan.name}`,
          userId: session.user.id,
          weeklyMealPlanId: savedMealPlan.id,
          isPublic: false,
        },
      });
      console.log("âœ… Liste de courses crÃ©Ã©e");
    } catch (dbError) {
      console.error("âŒ Erreur lors de la sauvegarde en base de donnÃ©es:", dbError);
      console.error("Type d'erreur:", dbError instanceof Error ? dbError.constructor.name : typeof dbError);
      if (dbError instanceof Error) {
        console.error("Message d'erreur:", dbError.message);
        console.error("Stack trace:", dbError.stack);
      }
      throw new Error(`Erreur de sauvegarde: ${dbError instanceof Error ? dbError.message : 'Erreur inconnue'}`);
    }

    return NextResponse.json({
      ...menuData,
      savedPlanId: savedMealPlan.id,
    });
  } catch (error) {
    console.error("Error generating meal plan:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la gÃ©nÃ©ration du menu" },
      { status: 500 }
    );
  }
}
