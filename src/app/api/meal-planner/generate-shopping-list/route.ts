import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseGPTJson } from "@/lib/chatgpt-helpers";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper pour formater le temps en "Xmin Ys"
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}min ${seconds}s`;
  }
  return `${seconds}s`;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Fonctionnalité réservée aux utilisateurs Premium (OWNER) et ADMIN" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planId } = body;

    console.log(`🛒 [Optimisation Liste] Démarrage pour planId: ${planId}`);

    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      include: { meals: true },
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
          if (ingredientStr && ingredientStr !== 'undefined' && ingredientStr !== 'null' && ingredientStr !== '[object Object]') {
            allIngredients.push(ingredientStr.trim());
          }
        });
      }
    });

    console.log(`📝 [Optimisation Liste] ${allIngredients.length} ingrédients à traiter`);

    // Prompt optimisé - concis et direct
    const prompt = `Regroupe et additionne ces ingrédients par catégorie.

INGRÉDIENTS:
${allIngredients.join(', ')}

RÈGLES:
- Additionne les quantités identiques (ex: "2 oeufs" x3 = "Oeufs (6)")
- Convertis les unités similaires
- Format: "Nom (quantité)"

JSON uniquement:
{"shoppingList":{"Fruits & Légumes":[],"Viandes & Poissons":[],"Produits Laitiers":[],"Pain & Boulangerie":[],"Épicerie":[],"Condiments & Sauces":[],"Surgelés":[],"Snacks & Sucré":[],"Boissons":[],"Autres":[]}}`;

    console.log(`🤖 [Optimisation Liste] Appel OpenAI...`);
    const apiStartTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu additionnes les ingrédients et retournes UNIQUEMENT du JSON valide. Sois concis.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Plus bas = plus rapide et déterministe
      max_completion_tokens: 4000, // Largement suffisant pour une liste de courses
    });

    const apiTime = Date.now() - apiStartTime;
    const content = completion.choices[0]?.message?.content;
    
    console.log(`📥 [Optimisation Liste] Réponse en ${formatDuration(apiTime)}, ${content?.length || 0} chars`);
    
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    const result = parseGPTJson(content);
    
    if (!result || !result.shoppingList) {
      console.error(`❌ [Optimisation Liste] Résultat invalide:`, content.substring(0, 300));
      throw new Error("Réponse ChatGPT invalide - shoppingList manquant");
    }
    
    const elapsedTime = Date.now() - startTime;
    console.log(`✅ [Optimisation Liste] Terminée en ${formatDuration(elapsedTime)} pour ${allIngredients.length} ingrédients`);

    return NextResponse.json(result);
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`❌ [Optimisation Liste] Échec après ${formatDuration(elapsedTime)}:`, error);
    
    let errorMessage = "Erreur inconnue";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
      
      if ('response' in error) {
        const openAIError = error as Error & { type?: string; code?: string; status?: number };
        errorDetails = JSON.stringify({
          message: openAIError.message,
          type: openAIError.type,
          code: openAIError.code,
          status: openAIError.status,
        }, null, 2);
      }
    }
    
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