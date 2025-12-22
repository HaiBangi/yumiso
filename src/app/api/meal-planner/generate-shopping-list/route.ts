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
    const { planId } = body;

    // Récupérer le plan avec tous les repas
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      include: {
        meals: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    // Extraire tous les ingrédients
    const allIngredients: string[] = [];
    plan.meals.forEach((meal) => {
      if (Array.isArray(meal.ingredients)) {
        meal.ingredients.forEach((ing) => {
          const ingredientStr = typeof ing === 'string' ? ing : String(ing);
          if (ingredientStr && ingredientStr !== 'undefined' && ingredientStr !== 'null') {
            allIngredients.push(ingredientStr);
          }
        });
      }
    });

    const prompt = `Tu es un assistant culinaire expert. Voici une liste d'ingrédients provenant de plusieurs recettes.

**Ingrédients:**
${allIngredients.join('\n')}

**Ta mission CRITIQUE - FAIRE LE CALCUL EXACT:**
1. **Regroupe les ingrédients identiques** (ex: "sauce soja", "Sauce soja", "sauce de soja" = même ingrédient)
2. **CALCULE ET ADDITIONNE TOUTES les quantités numériques** :
   - ⚠️ IMPORTANT: Extrais TOUS les nombres et additionne-les
   - Ex: "2 oeufs" + "2 oeufs" + "2 oeufs" = **6 oeufs** (PAS 2 oeufs + 1 oeuf!)
   - Ex: "1 oignon" + "1 oignon" + "1 oignon" = **3 oignons**
   - Ex: "200g boeuf" + "300g boeuf" = **500g boeuf**
3. **Convertis dans la même unité** si nécessaire
4. **Format final** : "Nom de l'ingrédient (quantité totale)"
5. **Trie alphabétiquement**
6. **Catégorise** par type

**⚠️ RÈGLE CRITIQUE D'ADDITION:**
- Compte CHAQUE occurrence de l'ingrédient
- Si "2 oeufs" apparaît 3 fois → 2+2+2 = **6 oeufs**
- Si "1 oeuf" apparaît 2 fois et "2 oeufs" 1 fois → 1+1+2 = **4 oeufs**
- NE JAMAIS séparer en plusieurs lignes (pas "2 oeufs" ET "1 oeuf" = FAUX)

**Format JSON strict (UNIQUEMENT du JSON):**
{
  "shoppingList": {
    "Légumes": ["Oignons (6)", "Carottes (500g)", ...],
    "Viandes & Poissons": ["Boeuf haché (800g)", ...],
    "Produits Laitiers": ["Œufs (6)", "Lait (450ml)", ...],
    "Épicerie": ["Riz (500g)", ...],
    "Condiments & Sauces": ["Sauce soja (3 c.à.s)", ...],
    "Autres": [...]
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en cuisine. Tu dois IMPÉRATIVEMENT additionner TOUTES les quantités identiques. Si un ingrédient apparaît plusieurs fois, tu DOIS calculer le total exact. Tu génères UNIQUEMENT du JSON valide.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_completion_tokens: 20000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    const result = parseGPTJson(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Erreur génération liste de courses:", error);
    
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
        error: "Erreur lors de la génération de la liste de courses",
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
