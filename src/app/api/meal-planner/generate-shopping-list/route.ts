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

**Ta mission:**
1. **Regroupe les ingrédients identiques** (ex: "sauce soja", "Sauce soja", "sauce de soja" = même ingrédient)
2. **Additionne TOUTES les quantités** du même ingrédient :
   - Ex: "0.25 c.à.s sauce soja" + "0.5 c.à.s sauce soja" + "1 c.à.c sauce soja" = "Sauce soja (1.75 c.à.s au total)"
   - Ex: "1 gousses d'ail" + "3 gousses d'ail" + "2 gousses d'ail" = "Gousses d'ail (6 au total)"
   - Ex: "200g boeuf haché" + "300g boeuf haché" = "Boeuf haché (500g au total)"
3. **Convertis dans la même unité** si nécessaire (c.à.c → c.à.s, g → kg si > 1000g)
4. **Normalise le format** : "Nom de l'ingrédient (quantité totale)"
5. **Trie alphabétiquement** par nom d'ingrédient dans chaque catégorie
6. **Catégorise** par type (Légumes, Viandes & Poissons, Produits Laitiers, Épicerie, Condiments & Sauces, Autres)

**Exemples de regroupement intelligent:**
- "2 oignons" + "1 oignon" + "3 oignons" → "Oignons (6 au total)"
- "0.25 c.à.s sauce soja" + "0.5 c.à.s sauce soja" → "Sauce soja (0.75 c.à.s au total)"
- "1 gousse d'ail" + "3 gousses d'ail" → "Gousses d'ail (4 au total)"
- "250ml lait" + "200ml lait" → "Lait (450ml au total)"

**Format JSON strict (UNIQUEMENT du JSON):**
{
  "shoppingList": {
    "Légumes": ["Oignons (6 au total)", "Carottes (500g au total)", ...],
    "Viandes & Poissons": ["Boeuf haché (800g au total)", ...],
    "Produits Laitiers": ["Œufs (6 au total)", "Lait (450ml au total)", ...],
    "Épicerie": ["Riz (500g au total)", ...],
    "Condiments & Sauces": ["Sauce soja (1.75 c.à.s au total)", ...],
    "Autres": [...]
  }
}

**Important:** 
- Regroupe TOUT ce qui est similaire (ignore la casse, les accents, le singulier/pluriel)
- Additionne TOUTES les quantités
- Format final : "Nom (quantité totale)"
- Trie alphabétiquement dans chaque catégorie`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en cuisine et en optimisation de listes de courses. Tu génères UNIQUEMENT du JSON valide.",
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
