import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
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

    // Support both formats: { recipe: {...} } or direct fields
    const recipeData = body.recipe || body;
    const { name, category, preparationTime, cookingTime, servings, ingredients, steps } = recipeData;

    console.log('[optimize] DonnÃ©es reÃ§ues:', { name, hasIngredients: !!ingredients, hasSteps: !!steps });

    if (!name || !ingredients || !steps) {
      console.log('[optimize] Erreur - donnÃ©es manquantes:', { name: !!name, ingredients: !!ingredients, steps: !!steps });
      return NextResponse.json({ error: "DonnÃ©es de recette manquantes" }, { status: 400 });
    }

    const prompt = `Tu es un chef cuisinier expert et rÃ©dacteur culinaire professionnel. Optimise cette recette pour la rendre plus claire et professionnelle.

**Recette actuelle:**
Nom: ${name}
CatÃ©gorie: ${category || 'Non spÃ©cifiÃ©e'}
Temps de prÃ©paration: ${preparationTime || 0} min
Temps de cuisson: ${cookingTime || 0} min
Portions: ${servings || 1}

**IngrÃ©dients:**
${ingredients.map((ing: any) => `- ${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()).join('\n')}

**Ã‰tapes:**
${steps.map((step: any, idx: number) => `${idx + 1}. ${step.text}`).join('\n')}

**Ta mission d'optimisation:**

1. **IngrÃ©dients:**
   - Si la recette a des parties distinctes (marinade, sauce, garniture, etc.), utilise "ingredientGroups"
   - Sinon, utilise une simple liste "ingredients"
   - Regroupe les ingrÃ©dients similaires si possible
   - Normalise les quantitÃ©s : convertis les fractions en dÃ©cimales (Â¼=0.25, Â½=0.5, Â¾=0.75)
   - Utilise TOUJOURS les abrÃ©viations franÃ§aises :
     * tbsp/Tbsp/cuillÃ¨re Ã  soupe â†’ c.Ã .s
     * tsp/Tsp/cuillÃ¨re Ã  cafÃ© â†’ c.Ã .c
     * ml, l, g, kg pour les mesures mÃ©triques
   - Pour les ingrÃ©dients sans quantitÃ© numÃ©rique, ne pas mettre "2 unitÃ©" mais directement "2 gousses d'ail", "3 tomates", etc.
   - Ajoute des prÃ©cisions si nÃ©cessaire (ex: "oignon" â†’ "oignon jaune moyen")

2. **Ã‰tapes de prÃ©paration - RÃˆGLES STRICTES:**
   - 1 ingrÃ©dient â†’ phrase simple : "Ajouter 2 c.Ã .s de sauce soja."
   - 2 ingrÃ©dients â†’ phrase avec "et" : "MÃ©langer la farine et le sel."
   - 3+ ingrÃ©dients â†’ OBLIGATOIRE format liste avec tirets et retours Ã  la ligne :
     "PrÃ©parer la base avec :\n- 250g de farine\n- 120ml d'eau\n- 0.25 c.Ã .c de sel\n\nMÃ©langer jusqu'Ã  obtenir une pÃ¢te lisse."
   - âš  JAMAIS de virgules pour sÃ©parer 3+ ingrÃ©dients dans une phrase
   - Inclure durÃ©es et indices visuels ("jusqu'Ã  ce que dorÃ©", "pendant 5 min")
   - Une Ã©tape = une action principale
   - Divise les Ã©tapes trop longues

3. **Temps et portions:**
   - VÃ©rifie que les temps sont rÃ©alistes
   - Ajuste si nÃ©cessaire

4. **Calories:**
   - Estime les calories par portion basÃ©es sur les ingrÃ©dients
   - Sois prÃ©cis et rÃ©aliste

**Format JSON strict (UNIQUEMENT du JSON):**

Pour une recette SIMPLE (sans groupes):
{
  "name": "Nom optimisÃ© (si amÃ©liorable)",
  "preparationTime": 30,
  "cookingTime": 45,
  "servings": 4,
  "caloriesPerServing": 450,
  "ingredients": [
    {
      "name": "nom de l'ingrÃ©dient",
      "quantity": 2,
      "unit": "c.Ã .s",
      "order": 0
    },
    {
      "name": "gousses d'ail",
      "quantity": 3,
      "unit": null,
      "order": 1
    }
  ],
  "steps": [
    {
      "text": "PrÃ©parer la marinade avec :\\n- 2 c.Ã .s de sauce soja\\n- 1 c.Ã .s de miel\\n- 3 gousses d'ail hachÃ©es\\n\\nMÃ©langer tous les ingrÃ©dients dans un bol jusqu'Ã  ce que le miel soit bien dissous.",
      "order": 1
    },
    {
      "text": "Ajouter 1 c.Ã .s d'huile de sÃ©same et bien mÃ©langer.",
      "order": 2
    }
  ],
  "optimizationNotes": "RÃ©sumÃ© des amÃ©liorations : utilisation d'abrÃ©viations franÃ§aises, format de liste pour 3+ ingrÃ©dients, clarification des Ã©tapes, estimation des calories"
}

Pour une recette COMPLEXE (avec groupes - ex: Bo Bun, Ramen, Loc Lac):
{
  "name": "Nom optimisÃ©",
  "preparationTime": 30,
  "cookingTime": 45,
  "servings": 4,
  "caloriesPerServing": 450,
  "ingredientGroups": [
    {
      "name": "Marinade",
      "ingredients": [
        { "name": "sauce de soja", "quantity": 2, "unit": "c.Ã .s" },
        { "name": "miel", "quantity": 1, "unit": "c.Ã .s" },
        { "name": "gousses d'ail", "quantity": 3, "unit": null }
      ]
    },
    {
      "name": "Garniture",
      "ingredients": [
        { "name": "salade", "quantity": 200, "unit": "g" },
        { "name": "carottes rÃ¢pÃ©es", "quantity": 100, "unit": "g" }
      ]
    }
  ],
  "steps": [
    {
      "text": "PrÃ©parer la marinade...",
      "order": 1
    }
  ],
  "optimizationNotes": "RÃ©sumÃ© des amÃ©liorations"
}

**Important:**
- Garde l'esprit de la recette originale
- N'ajoute pas d'ingrÃ©dients nouveaux
- AmÃ©liore uniquement la clartÃ© et la prÃ©cision
- Formate proprement les listes imbriquÃ©es dans les Ã©tapes
- Utilise c.Ã .s et c.Ã .c au lieu de cuillÃ¨re Ã  soupe/cafÃ©`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un chef cuisinier expert et rÃ©dacteur culinaire professionnel. Tu optimises les recettes pour les rendre plus claires, prÃ©cises et professionnelles. Tu gÃ©nÃ¨res UNIQUEMENT du JSON valide.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_completion_tokens: 20000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de rÃ©ponse de ChatGPT");
    }

    // Nettoyer le contenu avant de parser
    let cleanedContent = content.trim();

    // Retirer les backticks markdown si prÃ©sents
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const optimizedRecipe = JSON.parse(cleanedContent);

    return NextResponse.json(optimizedRecipe);
  } catch (error) {
    console.error("âŒ Erreur optimisation recette:", error);

    // Extraire les dÃ©tails de l'erreur
    let errorMessage = "Erreur inconnue";
    let errorDetails = "";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";

      // Si c'est une erreur OpenAI, extraire plus de dÃ©tails
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

    console.error("ðŸ“‹ DÃ©tails complets de l'erreur:", errorDetails);

    return NextResponse.json(
      {
        error: "Erreur lors de l'optimisation de la recette",
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
