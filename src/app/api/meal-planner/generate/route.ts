import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
        userRecipesContext = `\n\nVoici les recettes personnelles de l'utilisateur que tu peux inclure dans le planning :\n${userRecipes.map(r => `- ID:${r.id} | ${r.name} (${r.category}, ${r.preparationTime + r.cookingTime}min, ${r.servings} portions)`).join('\n')}`;
      }
    }

    const prompt = `Tu es un expert en nutrition et planification de repas. Génère un menu pour la semaine complet et détaillé.

**Contraintes :**
- Nombre de personnes : ${numberOfPeople}
- Budget : ${budget}
- Temps de cuisine disponible : ${cookingTime}
- Types de repas : ${mealTypes.join(', ')}
${cuisinePreferences.length > 0 ? `- Préférences culinaires : ${cuisinePreferences.join(', ')}` : ''}
${userRecipesContext}

**Instructions :**
1. Crée un menu pour 7 jours (Lundi à Dimanche)
2. Pour chaque jour, inclus les repas demandés (${mealTypes.join(', ')})
3. Équilibre nutritionnel : varie les sources de protéines, légumes, et féculents
4. Respecte STRICTEMENT toutes les contraintes (budget, temps)
5. Optimise pour réduire le gaspillage (réutilise des ingrédients)
6. Inclus des conseils pratiques (préparation à l'avance, batch cooking)
${useMyRecipes ? '7. PRIVILÉGIE les recettes personnelles de l\'utilisateur. Si tu utilises une recette de l\'utilisateur, mets son ID dans le champ recipeId' : ''}

**Format de réponse (JSON STRICT) :**
{
  "weekPlan": [
    {
      "day": "Lundi",
      "meals": [
        {
          "type": "Déjeuner",
          "name": "Nom du plat",
          "prepTime": 15,
          "cookTime": 30,
          "servings": ${numberOfPeople},
          "calories": 450,
          "ingredients": ["ingrédient 1", "ingrédient 2"],
          "steps": ["étape 1", "étape 2"],
          "isUserRecipe": false,
          "recipeId": null
        }
      ]
    }
  ],
  "shoppingList": {
    "Légumes": ["tomate x5", "oignon x3"],
    "Viandes": ["poulet 500g"],
    "Épicerie": ["riz 1kg"]
  },
  "prepTips": [
    "Conseil 1",
    "Conseil 2"
  ],
  "estimatedCost": "45-60€",
  "nutritionSummary": {
    "avgCaloriesPerDay": 2000,
    "proteinGrams": 80,
    "carbsGrams": 250,
    "fatGrams": 70
  }
}

Génère maintenant le menu complet en JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un expert nutritionniste et chef cuisinier. Tu génères des menus hebdomadaires équilibrés, variés et adaptés aux besoins. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 15000,
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    // Parse le JSON
    let menuData;
    try {
      menuData = JSON.parse(content);
    } catch (parseError) {
      console.error("Erreur de parsing JSON:", parseError);
      console.error("Contenu reçu:", content);
      throw new Error("Réponse ChatGPT invalide (pas du JSON valide)");
    }

    // Valider la structure des données
    if (!menuData.weekPlan || !Array.isArray(menuData.weekPlan)) {
      console.error("Structure invalide - weekPlan manquant ou invalide:", menuData);
      throw new Error("Structure de menu invalide");
    }

    if (!menuData.nutritionSummary) {
      console.error("Structure invalide - nutritionSummary manquant:", menuData);
      throw new Error("Résumé nutritionnel manquant");
    }

    console.log("✅ Données validées, création du plan en base de données...");
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

    // Sauvegarder le menu dans la base de données
    let savedMealPlan;
    try {
      console.log("💾 Sauvegarde du plan en base de données...");
      console.log("Structure des données reçues:", {
        hasWeekPlan: !!menuData.weekPlan,
        weekPlanLength: menuData.weekPlan?.length,
        firstDay: menuData.weekPlan?.[0],
      });

      // Préparer les données des repas
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
          
          console.log(`Repas préparé: ${mealData.dayOfWeek} - ${mealData.mealType} - ${mealData.name}`);
          return mealData;
        });
      }) || [];

      console.log(`📊 Total de ${mealsData.length} repas à créer`);

      if (mealsData.length === 0) {
        throw new Error("Aucun repas valide dans le menu généré");
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
          shoppingList: menuData.shoppingList || {},
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
      
      console.log(`✅ Plan sauvegardé avec l'ID: ${savedMealPlan.id}`);
      console.log(`   - ${savedMealPlan.meals.length} repas créés`);
    } catch (dbError) {
      console.error("❌ Erreur lors de la sauvegarde en base de données:", dbError);
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
      { error: error instanceof Error ? error.message : "Erreur lors de la génération du menu" },
      { status: 500 }
    );
  }
}
