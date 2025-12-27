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

    // Vérifier que l'utilisateur est ADMIN ou OWNER
    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Fonctionnalité réservée aux utilisateurs Premium (OWNER) et ADMIN" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planId } = body;

    console.log(`🛒 [Optimisation Liste] Démarrage pour planId: ${planId}`);

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

    console.log(`📝 [Optimisation Liste] ${allIngredients.length} ingrédients à traiter`);

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
    "Fruits & Légumes": ["Oignons (6)", "Carottes (500g)", "Bananes (3)", ...],
    "Viandes & Poissons": ["Boeuf haché (800g)", "Poulet (500g)", ...],
    "Produits Laitiers": ["Œufs (6)", "Lait (450ml)", "Fromage (200g)", ...],
    "Pain & Boulangerie": ["Baguette (2)", "Pain de mie (1)", ...],
    "Épicerie": ["Riz (500g)", "Pâtes (400g)", "Farine (250g)", ...],
    "Condiments & Sauces": ["Sauce soja (3 c.à.s)", "Huile d'olive (2 c.à.s)", ...],
    "Surgelés": ["Petits pois surgelés (200g)", ...],
    "Snacks & Sucré": ["Chocolat (100g)", "Biscuits (1 paquet)", ...],
    "Boissons": ["Jus d'orange (1L)", "Eau gazeuse (1.5L)", ...],
    "Autres": [...]
  }
}`;

    console.log(`🤖 [Optimisation Liste] Appel OpenAI en cours...`);
    
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
      max_completion_tokens: 30000,
    });

    const content = completion.choices[0]?.message?.content;
    
    console.log(`📥 [Optimisation Liste] Réponse reçue, longueur: ${content?.length || 0} caractères`);
    
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }
    
    // Log pour debug - premiers 500 caractères de la réponse
    console.log(`📄 [Optimisation Liste] Début de la réponse: ${content.substring(0, 500)}...`);

    const result = parseGPTJson(content);
    
    // Vérifier que le résultat est valide
    if (!result || !result.shoppingList) {
      console.error(`❌ [Optimisation Liste] Résultat invalide:`, JSON.stringify(result).substring(0, 500));
      throw new Error("Réponse ChatGPT invalide - shoppingList manquant");
    }
    
    const elapsedTime = Date.now() - startTime;
    console.log(`✅ [Optimisation Liste] Terminée en ${formatDuration(elapsedTime)} pour ${allIngredients.length} ingrédients`);

    return NextResponse.json(result);
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`❌ [Optimisation Liste] Échec après ${formatDuration(elapsedTime)}:`, error);
    
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
