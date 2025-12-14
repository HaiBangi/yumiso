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
1. Regroupe les ingrédients similaires (ex: "2 oignons" + "1 oignon" = "3 oignons")
2. Additionne les quantités quand c'est possible
3. Convertis dans la même unité si nécessaire
4. Trie alphabétiquement par nom d'ingrédient
5. Catégorise par type (Légumes, Viandes & Poissons, Produits Laitiers, Épicerie, Condiments & Sauces, Autres)

**Format JSON strict (UNIQUEMENT du JSON):**
{
  "shoppingList": {
    "Légumes": ["3 oignons", "500g carottes", ...],
    "Viandes & Poissons": ["800g boeuf haché", ...],
    "Produits Laitiers": ["6 œufs", "250ml lait", ...],
    "Épicerie": ["500g riz", ...],
    "Condiments & Sauces": ["3 c.à.s sauce soja", ...],
    "Autres": [...]
  }
}

**Important:** Trie chaque catégorie par ordre alphabétique et regroupe intelligemment.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      temperature: 0.3,
      max_completion_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    const result = JSON.parse(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Erreur génération liste de courses:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la génération",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
