﻿import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import OpenAI from "openai";
import type { Category, CostEstimate } from "@/types/recipe";
import { cache } from "@/lib/cache";
import { parseGPTJson } from "@/lib/chatgpt-helpers";

const SYSTEM_PROMPT = `Tu es un assistant culinaire expert qui convertit des transcriptions de vidÃ©os YouTube de recettes en recettes structurÃ©es au format JSON.

Pour chaque vidÃ©o, tu dois extraire :  
- Nom de la recette  
- Description courte et appÃ©tissante  
- CatÃ©gorie (CHOISIS LA PLUS APPROPRIÃ‰E) :  
  - Plats : MAIN_DISH (plat principal), STARTER (entrÃ©e), SIDE_DISH (accompagnement)  
  - Soupes et salades : SOUP, SALAD  
  - Desserts et pÃ¢tisserie : DESSERT, CAKE, PASTRY, COOKIE  
  - Petit-dÃ©jeuner : BREAKFAST, BRUNCH  
  - Snacks : SNACK, APPETIZER  
  - Boissons : BEVERAGE, SMOOTHIE, COCKTAIL  
  - Bases culinaires : SAUCE, MARINADE, DRESSING, SPREAD  
  - Pain : BREAD  
  - Conserves : PRESERVES  
  - Autre : OTHER  
  âš  VÃ©rifie la nature exacte du plat avant de choisir. Exceptions :  
    - sauce â†’ SAUCE  
    - marinade â†’ MARINADE  
    - vinaigrette â†’ DRESSING  
    - smoothie/jus â†’ SMOOTHIE  
    - cocktail â†’ COCKTAIL  
    - tartinade â†’ SPREAD  
    - conserves/confiture â†’ PRESERVES  

- Auteur/chef si mentionnÃ©  
- Temps de prÃ©paration et cuisson (en minutes)  
- Nombre de portions  
- Estimation du coÃ»t : CHEAP, MEDIUM, EXPENSIVE  
- Note (sur 5)  
- Calories par portion (estimation rÃ©aliste basÃ©e sur ingrÃ©dients, quantitÃ©s et cuisson, nombre entier)  
- Tags pertinents (3 Ã  5 tags, minuscules, selon origine, rÃ©gime, ingrÃ©dient principal ou occasion)  
- IngrÃ©dients avec quantitÃ©s et unitÃ©s (toujours en franÃ§ais)  
- Groupes dâ€™ingrÃ©dients si la recette a des parties distinctes (ex : pÃ¢te/garniture, base/sauce, etc.)  
- Ã‰tapes de prÃ©paration numÃ©rotÃ©es et dÃ©taillÃ©es  

RÃ¨gles essentielles :  

**IngrÃ©dients et unitÃ©s**  
- Pas de doublons dans la mÃªme liste ou groupe.  
- Convertis les fractions en dÃ©cimales : Â¼=0.25, Â½=0.5, Â¾=0.75, â…“=0.33, etc.  
- Traduire tous les ingrÃ©dients et quantitÃ©s en franÃ§ais.  
- QuantitÃ©s : toujours des float. Par exemple si la recette indique 1-2 oignons, choisis soit 1 soit 2.  
- UnitÃ©s : tbsp/Tbsp â†’ c.Ã .s, tsp/Tsp â†’ c.Ã .c, ml, l, g, kg, pincÃ©e, etc. 1/3 cup=80ml, 2/3 cup=160ml, 1 cup = 240ml, etc. 

**Groupes dâ€™ingrÃ©dients**  
- CrÃ©e des groupes si la recette a des parties distinctes (ex : pÃ¢te, garniture, sauce).  
- Sinon, utilise une seule liste "ingredients".  

**Ã‰tapes de prÃ©paration**  
- Mentionne tous les ingrÃ©dients utilisÃ©s et techniques (verser, mÃ©langer, cuireâ€¦) avec durÃ©es et indices visuels si prÃ©sents dans la vidÃ©o.  
- 1 ingrÃ©dient â†’ phrase simple.  
- 2 ingrÃ©dients â†’ phrase avec "et".  
- 3 ingrÃ©dients ou plus â†’ format liste avec tirets et retour Ã  la ligne.  
- Jamais utiliser des virgules pour sÃ©parer 3+ ingrÃ©dients dans une phrase, il faut utiliser une liste Ã  puces avec des tirets.  
- NumÃ©rote les Ã©tapes dans l'ordre exact du transcript.  
- **IMPORTANT pour les quantitÃ©s dans les Ã©tapes** : Ne jamais Ã©crire de dÃ©cimales inutiles (.0). Exemples :  
  âœ… "cuire 300g de riz" (PAS 300.0g)  
  âœ… "ajouter 2 c.Ã .s de sauce" (PAS 2.0 c.Ã .s)  
  âœ… "verser 450ml d'eau" (PAS 450.0ml)  
  âœ… "incorporer 8.5g de sel" (8.5 est OK car c'est une vraie dÃ©cimale)  
  âœ… "utiliser 0.5 c.Ã .c de poivre" (0.5 est OK)  

**Calories**  
- Estime en fonction des ingrÃ©dients et cuisson.  
- Plats riches en huile, beurre, sucre ou fromage â†’ calories plus Ã©levÃ©es.  
- Plats lÃ©gers ou Ã  base de lÃ©gumes/protÃ©ines maigres â†’ calories plus basses.  

**JSON Ã  gÃ©nÃ©rer**  
- Pour recettes simples : utilise "ingredients"  
- Pour recettes complexes : utilise "ingredientGroups"  

âš  PRIORITÃ‰ : utilise toujours les quantitÃ©s du transcript plutÃ´t que la description et ne jamais inventer dâ€™informations.  

Exemple JSON avec groupes dâ€™ingrÃ©dients :  
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
      "name": "PÃ¢te",
      "ingredients": [
        { "name": "farine", "quantity": 250, "unit": "g" },
        { "name": "eau", "quantity": 0.5, "unit": "l" },
        { "name": "sel", "quantity": 0.25, "unit": "c.Ã .c" }
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
    { "order": 1, "text": "MÃ©langer les ingrÃ©dients secs :\n- 250g de farine\n- 0.25 c.Ã .c de sel\n- 1 c.Ã .c de levure\n\nBien combiner tous les ingrÃ©dients dans un grand bol." },
    { "order": 2, "text": "Ajouter progressivement 120ml d'eau froide en mÃ©langeant avec une cuillÃ¨re jusqu'Ã  obtenir une pÃ¢te lisse sans grumeaux. La consistance doit Ãªtre souple mais pas collante." },
    { "order": 3, "text": "Ajouter 1 c.Ã .s d'huile d'olive et pÃ©trir pendant 5 minutes jusqu'Ã  ce que la pÃ¢te soit Ã©lastique." }
  ]
}

Exemple JSON sans groupes dâ€™ingrÃ©dients :  
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
    { "name": "sel", "quantity": 0.25, "unit": "c.Ã .c" },
    { "name": "sauce de soja", "quantity": 1, "unit": "c.Ã .s" },
    { "name": "sauce huitre", "quantity": 1, "unit": "c.Ã .s" }
  ],
  "steps": [
    { "order": 1, "text": "PrÃ©parer la base avec :\n- 250g de farine\n- 120ml d'eau froide\n- 0.25 c.Ã .c de sel\n- 1 c.Ã .s de sauce de soja\n- 1 c.Ã .s de sauce huitre\n\nMÃ©langer dans un bol jusqu'Ã  obtenir une pÃ¢te lisse sans grumeaux." },
    { "order": 2, "text": "Ajouter 1 c.Ã .s de sauce de soja et 1 c.Ã .s de sauce huitre. Bien mÃ©langer pendant 2-3 minutes pour dÃ©velopper le gluten. La pÃ¢te doit Ãªtre Ã©lastique et souple." }
  ]
}`

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // VÃ©rifier l'authentification
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifiÃ©" },
        { status: 401 }
      );
    }

    // VÃ©rifier que l'utilisateur est admin ou owner et rÃ©cupÃ©rer son pseudo
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { 
        role: true,
        pseudo: true,
      },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
      return NextResponse.json(
        { error: "AccÃ¨s refusÃ©" },
        { status: 403 }
      );
    }

    const userPseudo = user.pseudo || "Anonyme";

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
    const cachedRecipe = cache.get<Record<string, unknown>>(cacheKey);
    if (cachedRecipe) {
      console.log("[Generate Recipe] Cache hit - Recette trouvee dans le cache");
      return NextResponse.json({ recipe: cachedRecipe });
    }

    // VÃ©rifier la clÃ© API OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY n'est pas configurÃ©e dans les variables d'environnement" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    // CrÃ©er le prompt utilisateur
    const userPrompt = `
Titre de la vidÃ©o: ${title}
ChaÃ®ne YouTube: ${author || userPseudo}

Description:
${description}

Transcription:
${transcript.slice(0, 8000)} ${transcript.length > 8000 ? "..." : ""}

Analyse cette vidÃ©o de recette et extrais toutes les informations pertinentes pour crÃ©er une recette structurÃ©e. 
Utilise le nom de la chaÃ®ne YouTube "${author || userPseudo}" comme auteur de la recette.`;

    console.log("[Generate Recipe] Appel de l'API OpenAI avec le modÃ¨le gpt-5.1-mini...");

    // Appeler ChatGPT
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini", // ModÃ¨le GPT-5.1 mini
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 1,
      max_completion_tokens: 20000, // AugmentÃ© pour les recettes complexes
      response_format: { type: "json_object" },
    });

    console.log("[Generate Recipe] RÃ©ponse reÃ§ue de OpenAI");
    console.log("[Generate Recipe] Finish reason:", completion.choices[0]?.finish_reason);
    console.log("[Generate Recipe] Has content:", !!completion.choices[0]?.message?.content);

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error("[Generate Recipe] Pas de contenu dans la rÃ©ponse OpenAI");
      console.error("[Generate Recipe] Completion object:", JSON.stringify(completion, null, 2));
      throw new Error("Pas de rÃ©ponse de ChatGPT");
    }

    // Parser la rÃ©ponse JSON
    const recipe = parseGPTJson(content);

    // Valider et nettoyer la recette
    const validatedRecipe = {
      name: recipe.name || "Recette sans nom",
      description: recipe.description || null,
      category: (recipe.category || "MAIN_DISH") as Category,
      author: author || recipe.author || userPseudo,
      preparationTime: Number(recipe.preparationTime) || 0,
      cookingTime: Number(recipe.cookingTime) || 0,
      servings: Number(recipe.servings) || 4,
      caloriesPerServing: recipe.caloriesPerServing ? Number(recipe.caloriesPerServing) : null,
      costEstimate: (recipe.costEstimate || "MEDIUM") as CostEstimate,
      rating: 0,
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

    // Retourner la recette SANS la sauvegarder - la sauvegarde se fera via le formulaire
    console.log(`[Generate Recipe] âœ… Recette "${validatedRecipe.name}" gÃ©nÃ©rÃ©e (non sauvegardÃ©e)`);
    
    return NextResponse.json({
      recipe: validatedRecipe,
    });
  } catch (error) {
    console.error("Error in /api/youtube/generate-recipe:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : "Une erreur est survenue lors de la gÃ©nÃ©ration de la recette" 
      },
      { status: 500 }
    );
  }
}
