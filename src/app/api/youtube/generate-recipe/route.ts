import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import OpenAI from "openai";
import type { Category, CostEstimate } from "@/types/recipe";
import { cache } from "@/lib/cache";

const SYSTEM_PROMPT = `Tu es un assistant culinaire expert qui convertit des transcriptions de vidéos YouTube de recettes en recettes structurées au format JSON.

Pour chaque vidéo, tu dois extraire :  
- Nom de la recette  
- Description courte et appétissante  
- Catégorie (CHOISIS LA PLUS APPROPRIÉE) :  
  - Plats : MAIN_DISH (plat principal), STARTER (entrée), SIDE_DISH (accompagnement)  
  - Soupes et salades : SOUP, SALAD  
  - Desserts et pâtisserie : DESSERT, CAKE, PASTRY, COOKIE  
  - Petit-déjeuner : BREAKFAST, BRUNCH  
  - Snacks : SNACK, APPETIZER  
  - Boissons : BEVERAGE, SMOOTHIE, COCKTAIL  
  - Bases culinaires : SAUCE, MARINADE, DRESSING, SPREAD  
  - Pain : BREAD  
  - Conserves : PRESERVES  
  - Autre : OTHER  
  ⚠ Vérifie la nature exacte du plat avant de choisir. Exceptions :  
    - sauce → SAUCE  
    - marinade → MARINADE  
    - vinaigrette → DRESSING  
    - smoothie/jus → SMOOTHIE  
    - cocktail → COCKTAIL  
    - tartinade → SPREAD  
    - conserves/confiture → PRESERVES  

- Auteur/chef si mentionné  
- Temps de préparation et cuisson (en minutes)  
- Nombre de portions  
- Estimation du coût : CHEAP, MEDIUM, EXPENSIVE  
- Note (sur 5)  
- Calories par portion (estimation réaliste basée sur ingrédients, quantités et cuisson, nombre entier)  
- Tags pertinents (3 à 5 tags, minuscules, selon origine, régime, ingrédient principal ou occasion)  
- Ingrédients avec quantités et unités (toujours en français)  
- Groupes d’ingrédients si la recette a des parties distinctes (ex : pâte/garniture, base/sauce, etc.)  
- Étapes de préparation numérotées et détaillées  

Règles essentielles :  

**Ingrédients et unités**  
- Pas de doublons dans la même liste ou groupe.  
- Convertis les fractions en décimales : ¼=0.25, ½=0.5, ¾=0.75, ⅓=0.33, etc.  
- Traduire tous les ingrédients et quantités en français.  
- Unités : tbsp/Tbsp → c.à.s, tsp/Tsp → c.à.c, ml, l, g, kg, pincée, etc. 1/3 cup=80ml, 2/3 cup=160ml, 1 cup = 240ml, etc. 

**Groupes d’ingrédients**  
- Crée des groupes si la recette a des parties distinctes (ex : pâte, garniture, sauce).  
- Sinon, utilise une seule liste "ingredients".  

**Étapes de préparation**  
- Mentionne tous les ingrédients utilisés et techniques (verser, mélanger, cuire…) avec durées et indices visuels si présents dans la vidéo.  
- 1 ingrédient → phrase simple.  
- 2 ingrédients → phrase avec "et".  
- 3 ingrédients ou plus → format liste avec tirets et retour à la ligne.  
- Jamais utiliser des virgules pour séparer 3+ ingrédients dans une phrase, il faut utiliser une liste à puces avec des tirets.  
- Numérote les étapes dans l’ordre exact du transcript.  

**Calories**  
- Estime en fonction des ingrédients et cuisson.  
- Plats riches en huile, beurre, sucre ou fromage → calories plus élevées.  
- Plats légers ou à base de légumes/protéines maigres → calories plus basses.  

**JSON à générer**  
- Pour recettes simples : utilise "ingredients"  
- Pour recettes complexes : utilise "ingredientGroups"  

⚠ PRIORITÉ : utilise toujours les quantités du transcript plutôt que la description et ne jamais inventer d’informations.  

Exemple JSON avec groupes d’ingrédients :  
{
  "name": "Nom de la recette",
  "description": "Description courte",
  "category": "MAIN_DISH",
  "author": "Nom de l'auteur",
  "preparationTime": 30,
  "cookingTime": 45,
  "servings": 4,
  "costEstimate": "MEDIUM",
  "rating": 0,
  "caloriesPerServing": 450,
  "tags": ["tag1", "tag2"],
  "ingredientGroups": [
    {
      "name": "Pâte",
      "ingredients": [
        { "name": "farine", "quantity": 250, "unit": "g" },
        { "name": "eau", "quantity": 0.5, "unit": "l" },
        { "name": "sel", "quantity": 0.25, "unit": "c.à.c" }
      ]
    },
    {
      "name": "Garniture",
      "ingredients": [
        { "name": "tomates", "quantity": 3, "unit": null }
      ]
    }
  ],
  "steps": [
    { "order": 1, "text": "Mélanger les ingrédients secs :\n- 250g de farine\n- 0.25 c.à.c de sel\n- 1 c.à.c de levure\n\nBien combiner tous les ingrédients dans un grand bol." },
    { "order": 2, "text": "Ajouter progressivement 120ml d'eau froide en mélangeant avec une cuillère jusqu'à obtenir une pâte lisse sans grumeaux. La consistance doit être souple mais pas collante." },
    { "order": 3, "text": "Ajouter 1 c.à.s d'huile d'olive et pétrir pendant 5 minutes jusqu'à ce que la pâte soit élastique." }
  ]
}

Exemple JSON sans groupes d’ingrédients :  
{
  "name": "Nom de la recette",
  "description": "Description courte",
  "category": "MAIN_DISH",
  "author": "Nom de l'auteur",
  "preparationTime": 30,
  "cookingTime": 45,
  "servings": 4,
  "costEstimate": "MEDIUM",
  "rating": 0,
  "caloriesPerServing": 380,
  "tags": ["tag1", "tag2"],
  "ingredients": [
    { "name": "farine", "quantity": 250, "unit": "g" },
    { "name": "eau", "quantity": 0.5, "unit": "l" },
    { "name": "sel", "quantity": 0.25, "unit": "c.à.c" },
    { "name": "sauce de soja", "quantity": 1, "unit": "c.à.s" },
    { "name": "sauce huitre", "quantity": 1, "unit": "c.à.s" }
  ],
  "steps": [
    { "order": 1, "text": "Préparer la base avec :\n- 250g de farine\n- 120ml d'eau froide\n- 0.25 c.à.c de sel\n- 1 c.à.s de sauce de soja\n- 1 c.à.s de sauce huitre\n\nMélanger dans un bol jusqu'à obtenir une pâte lisse sans grumeaux." },
    { "order": 2, "text": "Ajouter 1 c.à.s de sauce de soja et 1 c.à.s de sauce huitre. Bien mélanger pendant 2-3 minutes pour développer le gluten. La pâte doit être élastique et souple." }
  ]
}`

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Vérifier l'authentification
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin ou owner
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }

    const { title, description, transcript, videoUrl, imageUrl, author } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: "La transcription est requise" },
        { status: 400 }
      );
    }

    // Creer une cle de cache basee sur le contenu
    const cacheKey = `chatgpt:recipe:${title}:${transcript.substring(0, 100)}`;
    
    // Verifier le cache
    const cachedRecipe = cache.get<any>(cacheKey);
    if (cachedRecipe) {
      console.log("[Generate Recipe] Cache hit - Recette trouvee dans le cache");
      return NextResponse.json({ recipe: cachedRecipe });
    }

    // Vérifier la clé API OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY n'est pas configurée dans les variables d'environnement" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    // Créer le prompt utilisateur
    const userPrompt = `
Titre de la vidéo: ${title}
Chaîne YouTube: ${author || "YouTube"}

Description:
${description}

Transcription:
${transcript.slice(0, 8000)} ${transcript.length > 8000 ? "..." : ""}

Analyse cette vidéo de recette et extrais toutes les informations pertinentes pour créer une recette structurée. 
Utilise le nom de la chaîne YouTube "${author || "YouTube"}" comme auteur de la recette.`;

    console.log("[Generate Recipe] Appel de l'API OpenAI avec le modèle gpt-5.1-mini...");

    // Appeler ChatGPT
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini", // Modèle GPT-5.1 mini
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 1,
      max_completion_tokens: 6000, // Augmenté pour les recettes complexes
      response_format: { type: "json_object" },
    });

    console.log("[Generate Recipe] Réponse reçue de OpenAI");
    console.log("[Generate Recipe] Finish reason:", completion.choices[0]?.finish_reason);
    console.log("[Generate Recipe] Has content:", !!completion.choices[0]?.message?.content);

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error("[Generate Recipe] Pas de contenu dans la réponse OpenAI");
      console.error("[Generate Recipe] Completion object:", JSON.stringify(completion, null, 2));
      throw new Error("Pas de réponse de ChatGPT");
    }

    // Parser la réponse JSON
    const recipe = JSON.parse(content);

    // Valider et nettoyer la recette
    const validatedRecipe = {
      name: recipe.name || "Recette sans nom",
      description: recipe.description || null,
      category: (recipe.category || "MAIN_DISH") as Category,
      author: author || recipe.author || "YouTube", // Priorité au nom de la chaîne YouTube
      preparationTime: Number(recipe.preparationTime) || 0,
      cookingTime: Number(recipe.cookingTime) || 0,
      servings: Number(recipe.servings) || 4,
      caloriesPerServing: recipe.caloriesPerServing ? Number(recipe.caloriesPerServing) : null,
      costEstimate: (recipe.costEstimate || "MEDIUM") as CostEstimate,
      rating: 0, // Pas de note par défaut pour les imports YouTube
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      ingredients: recipe.ingredients || [],
      ingredientGroups: recipe.ingredientGroups || undefined,
      steps: Array.isArray(recipe.steps)
        ? recipe.steps.map((step: { order?: number; text?: string }, index: number) => ({
            order: step.order || index + 1,
            text: step.text || "",
          }))
        : [],
    };

    // Mettre en cache pour 24 heures
    cache.set(cacheKey, validatedRecipe, 1000 * 60 * 60 * 24);

    return NextResponse.json({
      recipe: validatedRecipe,
    });
  } catch (error) {
    console.error("Error in /api/youtube/generate-recipe:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : "Une erreur est survenue lors de la génération de la recette" 
      },
      { status: 500 }
    );
  }
}
