import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";

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
    const { recipe } = body;

    const prompt = `Tu es un chef cuisinier expert et rédacteur culinaire professionnel. Optimise cette recette pour la rendre plus claire et professionnelle.

**Recette actuelle:**
Nom: ${recipe.name}
Catégorie: ${recipe.category}
Temps de préparation: ${recipe.preparationTime} min
Temps de cuisson: ${recipe.cookingTime} min
Portions: ${recipe.servings}

**Ingrédients:**
${recipe.ingredients.map((ing: any) => `- ${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()).join('\n')}

**Étapes:**
${recipe.steps.map((step: any, idx: number) => `${idx + 1}. ${step.text}`).join('\n')}

**Ta mission d'optimisation:**

1. **Ingrédients:**
   - Regroupe les ingrédients similaires si possible
   - Normalise les quantités : convertis les fractions en décimales (¼=0.25, ½=0.5, ¾=0.75)
   - Utilise TOUJOURS les abréviations françaises :
     * tbsp/Tbsp/cuillère à soupe → c.à.s
     * tsp/Tsp/cuillère à café → c.à.c
     * ml, l, g, kg pour les mesures métriques
   - Pour les ingrédients sans quantité numérique, ne pas mettre "2 unité" mais directement "2 gousses d'ail", "3 tomates", etc.
   - Ajoute des précisions si nécessaire (ex: "oignon" → "oignon jaune moyen")

2. **Étapes de préparation - RÈGLES STRICTES:**
   - 1 ingrédient → phrase simple : "Ajouter 2 c.à.s de sauce soja."
   - 2 ingrédients → phrase avec "et" : "Mélanger la farine et le sel."
   - 3+ ingrédients → OBLIGATOIRE format liste avec tirets et retours à la ligne :
     "Préparer la base avec :\n- 250g de farine\n- 120ml d'eau\n- 0.25 c.à.c de sel\n\nMélanger jusqu'à obtenir une pâte lisse."
   - ⚠ JAMAIS de virgules pour séparer 3+ ingrédients dans une phrase
   - Inclure durées et indices visuels ("jusqu'à ce que doré", "pendant 5 min")
   - Une étape = une action principale
   - Divise les étapes trop longues

3. **Temps et portions:**
   - Vérifie que les temps sont réalistes
   - Ajuste si nécessaire

4. **Calories:**
   - Estime les calories par portion basées sur les ingrédients
   - Sois précis et réaliste

**Format JSON strict (UNIQUEMENT du JSON):**
{
  "name": "Nom optimisé (si améliorable)",
  "preparationTime": 30,
  "cookingTime": 45,
  "servings": 4,
  "caloriesPerServing": 450,
  "ingredients": [
    {
      "name": "nom de l'ingrédient",
      "quantity": 2,
      "unit": "c.à.s",
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
      "text": "Préparer la marinade avec :\n- 2 c.à.s de sauce soja\n- 1 c.à.s de miel\n- 3 gousses d'ail hachées\n\nMélanger tous les ingrédients dans un bol jusqu'à ce que le miel soit bien dissous.",
      "order": 1
    },
    {
      "text": "Ajouter 1 c.à.s d'huile de sésame et bien mélanger.",
      "order": 2
    }
  ],
  "optimizationNotes": "Résumé des améliorations : utilisation d'abréviations françaises, format de liste pour 3+ ingrédients, clarification des étapes, estimation des calories"
}

**Important:**
- Garde l'esprit de la recette originale
- N'ajoute pas d'ingrédients nouveaux
- Améliore uniquement la clarté et la précision
- Formate proprement les listes imbriquées dans les étapes
- Utilise c.à.s et c.à.c au lieu de cuillère à soupe/café`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un chef cuisinier expert et rédacteur culinaire professionnel. Tu optimises les recettes pour les rendre plus claires, précises et professionnelles. Tu génères UNIQUEMENT du JSON valide.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    const optimizedRecipe = JSON.parse(content);

    return NextResponse.json(optimizedRecipe);
  } catch (error) {
    console.error("❌ Erreur optimisation recette:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'optimisation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
