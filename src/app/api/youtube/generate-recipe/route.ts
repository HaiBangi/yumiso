import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import OpenAI from "openai";
import type { Category, CostEstimate } from "@/types/recipe";
import { cache } from "@/lib/cache";

const SYSTEM_PROMPT = `Tu es un assistant culinaire expert qui convertit des transcriptions de vidéos YouTube de recettes en recettes structurées.

Tu dois analyser la transcription et la description de la vidéo et extraire :
- Le nom de la recette
- Une description courte et appétissante
- La catégorie parmi ces options (CHOISIS LA PLUS APPROPRIÉE) :
  * Plats : MAIN_DISH (plat principal), STARTER (entrée), SIDE_DISH (accompagnement)
  * Soupes et salades : SOUP (soupe/potage), SALAD (salade)
  * Desserts et pâtisserie : DESSERT (dessert), CAKE (gâteau), PASTRY (pâtisserie), COOKIE (biscuit/cookie)
  * Petit-déjeuner : BREAKFAST (petit-déjeuner), BRUNCH (brunch)
  * Snacks : SNACK (en-cas/collation), APPETIZER (apéritif/tapas)
  * Boissons : BEVERAGE (boisson), SMOOTHIE (smoothie/jus), COCKTAIL (cocktail)
  * Bases culinaires : SAUCE (sauce/condiment), MARINADE (marinade), DRESSING (vinaigrette), SPREAD (tartinade)
  * Pain : BREAD (pain/viennoiserie)
  * Conserves : PRESERVES (conserves/confitures)
  * Autre : OTHER (autre)
- L'auteur/chef si mentionné
- Le temps de préparation (en minutes)
- Le temps de cuisson (en minutes)
- Le nombre de portions
- L'estimation du coût (CHEAP, MEDIUM, EXPENSIVE)
- La note (sur 5)
- Les tags/mots-clés pertinents (AU MINIMUM 3-4 tags)
- Les ingrédients avec quantités et unités (TOUJOURS EN FRANÇAIS - traduis si nécessaire)
- Les groupes d'ingrédients SI ET SEULEMENT SI la recette a des parties distinctes (ex: pâte/garniture, base/sauce, etc.)
- Les étapes de préparation numérotées

IMPORTANT pour la CATÉGORIE :
- Une SAUCE (sauce nuoc mam, sauce tomate, etc.) → SAUCE, jamais DESSERT
- Une MARINADE → MARINADE
- Une VINAIGRETTE → DRESSING  
- Un SMOOTHIE ou JUS → SMOOTHIE
- Un COCKTAIL → COCKTAIL
- Une TARTINADE (pâte à tartiner, houmous) → SPREAD
- Des CONSERVES ou CONFITURES → PRESERVES
- VÉRIFIE bien la nature du plat avant de choisir la catégorie

IMPORTANT pour les FRACTIONS et QUANTITÉS :
- Reconnais et convertis correctement les fractions spéciales :
  * ¼ = 0.25
  * ½ = 0.5
  * ¾ = 0.75
  * ⅓ = 0.33
  * ⅔ = 0.67
  * 1⅓ = 1.33
  * 1½ = 1.5
  * Etc.
- PRIORITÉ ABSOLUE : Utilise les quantités de la TRANSCRIPTION plutôt que la description
- Si une quantité est ambiguë ou manquante dans la transcription, utilise la description comme secours
- VÉRIFIE que les quantités numériques sont cohérentes et logiques pour le contexte
- Exemple : "¼ de c à c" = 0.25 (c à c), pas 1 ou 1.5
- Sois particulièrement attentif aux fractions écrites en symboles (¼, ½, ¾) ou en texte ("un quart", "demi")

IMPORTANT pour les tags :
- Choisis AU MINIMUM 3 à 4 tags pertinents parmi ces catégories :
  * Origine : français, italien, asiatique, thaïlandais, japonais, chinois, indien, méditerranéen, moyen-oriental, américain, mexicain
  * Régime : végétarien, vegan, sans gluten, sans lactose
  * Ingrédient principal : poisson, fruits de mer, viande, volaille, pâtes, riz, céréales, légumes, fromage, fruits
  * Occasion : facile, rapide, économique, festif, healthy
- NE PAS inclure le type de plat (entrée, plat principal, dessert, etc.) dans les tags car c'est déjà dans la catégorie
- Utilise des tags en minuscules et pertinents pour la recette
- Exemples : ["italien", "pâtes", "végétarien"], ["asiatique", "riz", "poulet", "rapide"]

IMPORTANT pour les ingrédients :
- VÉRIFIE qu'il n'y a AUCUN doublon d'ingrédient dans la liste
- Chaque ingrédient doit apparaître UNE SEULE FOIS sauf s'il est utilisé dans des groupes d'ingrédients DIFFÉRENTS (ex: pâte vs garniture)
- Si tu vois le même ingrédient plusieurs fois dans le même groupe, SUPPRIME les doublons
- Exemples de doublons à éviter : "ail en poudre" qui apparaît 6 fois → doit apparaître 1 seule fois
- ATTENTION : Ne fusionne les ingrédients que s'ils sont identiques. Exemple : "sauce de soja" et "sauce huitre" sont des ingrédients différents

IMPORTANT pour la langue :
- TOUS les noms d'ingrédients doivent être en français
- Si un ingrédient est en anglais ou dans une autre langue, traduis-le en français
- Exemples : "flour" → "farine", "sugar" → "sucre", "chicken" → "poulet", "salt" → "sel"
- Les noms de groupes d'ingrédients doivent aussi être en français

IMPORTANT pour les groupes d'ingrédients :
- TOUJOURS essayer de regrouper les ingrédients par fonction/utilisation dans la recette
- Analyse la transcription et la description pour identifier les parties distinctes de la recette
- Exemples de groupes courants :
  * Pour un loc lac : "Riz", "Viande marinée", "Accompagnements"
  * Pour un bo bun : "Bœuf mariné", "Nems", "Vermicelles", "Sauce nuoc mam", "Légumes et garnitures"
  * Pour une pizza : "Pâte", "Sauce tomate", "Garniture"
  * Pour un gâteau : "Pâte", "Glaçage", "Décoration"
- Si tu identifies plusieurs étapes distinctes avec des ingrédients différents, UTILISE des groupes
- Même si ce n'est pas explicitement mentionné, infère les groupes logiques basés sur :
  * Les différentes préparations (marinade, sauce, base, etc.)
  * Les composantes du plat (viande, riz, légumes, sauce, etc.)
  * L'ordre de préparation (ce qui se fait séparément)
- Si c'est une recette très simple avec une seule liste d'ingrédients sans parties distinctes, utilise "ingredients" sans "ingredientGroups"
- Si tu utilises "ingredientGroups", ne remplis PAS le champ "ingredients"

IMPORTANT pour les ÉTAPES DE PRÉPARATION - FORMAT LISTE :

🚨 RÈGLE ABSOLUE - NE JAMAIS LISTER DES INGRÉDIENTS AVEC DES VIRGULES 🚨
- Si une étape mentionne 3 ingrédients ou plus, tu DOIS OBLIGATOIREMENT utiliser le format liste avec tirets
- N'utilise JAMAIS de virgules pour séparer 3 ingrédients ou plus dans une même phrase
- C'est une ERREUR GRAVE d'écrire : "Mélanger X, Y, Z, W, V et T"
- Tu DOIS écrire avec des tirets et des retours à la ligne

RÈGLES STRICTES PAR NOMBRE D'INGRÉDIENTS :

1️⃣ UN SEUL INGRÉDIENT → Phrase simple, PAS de liste
   Exemple : "Ajouter 1 c.à.c de bicarbonate de soude et mélanger bien."

2️⃣ DEUX INGRÉDIENTS → Phrase simple avec "et", PAS de liste
   Exemple : "Ajouter 2 c.à.s de sauce de soja et 1 c.à.s d'huile de sésame, puis mélanger."

3️⃣ TROIS INGRÉDIENTS OU PLUS → FORMAT LISTE OBLIGATOIRE AVEC TIRETS
   
   ❌ INTERDIT (avec virgules) :
   "Mélanger tous les ingrédients pour la sauce : 2 c.à.s d'eau, 2 c.à.s de sucre blond, 2 c.à.s de sauce soya salé, 1 c.à.s de vinaigre de riz, 1 c.à.s d'huile de sésame, 2 c.à.s de maïzéna et 0.5 c.à.c de sauce pimentée."
   
   ✅ OBLIGATOIRE (avec tirets) :
   "Mélanger tous les ingrédients pour la sauce :
- 2 c.à.s d'eau
- 2 c.à.s de sucre blond
- 2 c.à.s de sauce soya salé
- 1 c.à.s de vinaigre de riz
- 1 c.à.s d'huile de sésame
- 2 c.à.s de maïzéna
- 0.5 c.à.c de sauce pimentée

Bien mélanger jusqu'à homogénéité."

AUTRE EXEMPLE OBLIGATOIRE :

❌ INTERDIT :
"Mariner la viande avec 0.25 c.à.c de sel, 2 c.à.c d'alcool de riz, 2 c.à.c de sauce de soja foncée, 1 c.à.s de sauce de soja claire, 1 c.à.s de sauce d'huitre et 1 c.à.s d'huile."

✅ OBLIGATOIRE :
"Mariner la viande avec :
- 0.25 c.à.c de sel
- 2 c.à.c d'alcool de riz
- 2 c.à.c de sauce de soja foncée
- 1 c.à.s de sauce de soja claire
- 1 c.à.s de sauce d'huitre
- 1 c.à.s d'huile

Mélanger pour bien enrober la viande."

FORMAT DE LISTE REQUIS :
- Texte introductif se terminant par " :"
- Retour à la ligne après les ":"
- Chaque ingrédient sur sa propre ligne avec "- " au début
- Retour à la ligne après la liste
- Texte de conclusion (optionnel)

VÉRIFIE TOUJOURS : Si tu comptes 3 ingrédients ou plus dans une étape, TU DOIS utiliser le format liste avec tirets et retours à la ligne. C'est NON NÉGOCIABLE.

Réponds UNIQUEMENT avec un JSON valide suivant ce format :

AVEC groupes d'ingrédients (pour recettes complexes) :
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

SANS groupes d'ingrédients (pour recettes simples) :
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
}

NOTE SUR LES FRACTIONS :
- Les quantités doivent TOUJOURS être converties en décimales numériques
- Exemples : ½ c.à.c = { "quantity": 0.5, "unit": "c.à.c" }
- Exemple : 1½ c.à.c = { "quantity": 1.5, "unit": "c.à.c" }
- Exemple : ¼ de c.à.c = { "quantity": 0.25, "unit": "c.à.c" }

IMPORTANT pour les ÉTAPES DE PRÉPARATION :
- Les étapes doivent être DÉTAILLÉES et COMPLÈTES, extraites directement du transcript
- Chaque étape doit inclure :
  * Les ingrédients spécifiques utilisés à cette étape
  * Les techniques utilisées (verser, mélanger, cuire, chauffer, etc.)
  * Les durées ou températures mentionnées
  * Les indices visuels ou auditifs (couleur, texture, sons)
  * Les conseils ou astuces mentionnés dans la vidéo
- Les étapes doivent être concises mais informatives (2-3 phrases par étape)
- Extrais les détails DIRECTEMENT DU TRANSCRIPT, ne les invente pas
- Exemples :
  * MAUVAIS : "Cuire les pâtes"
  * BON : "Cuire les pâtes dans l'eau bouillante salée pendant 8-10 minutes jusqu'à ce qu'elles soient al dente"
  * MAUVAIS : "Mélanger les ingrédients"
  * BON : "Verser la farine et l'eau froide dans un bol et mélanger jusqu'à obtenir une pâte lisse sans grumeaux"
- Si la transcription mentionne des astuces ou des avertissements, inclus-les dans l'étape concernée
- Les étapes sont claires, numérotées dans l'ordre du transcript
- Les quantités sont des nombres (décimaux acceptés pour les fractions) (ou null si non spécifié)
- Les unités courantes : g, kg, ml, l, c.à.s, c.à.c, pincée, etc.
- Les étapes sont claires et numérotées dans l'ordre
- La catégorie correspond exactement à l'une des valeurs autorisées
- Le temps est en minutes
- N'invente pas d'informations qui ne sont pas dans la transcription
- Utilise PRIORITAIREMENT les quantités de la transcription, pas la description
- Pas de doublon d'ingrédient dans le même groupe

🚨 RAPPEL FINAL CRITIQUE 🚨
AVANT DE GÉNÉRER LE JSON, VÉRIFIE CHAQUE ÉTAPE :
- Compte le nombre d'ingrédients mentionnés dans chaque étape
- Si 3 ingrédients ou plus → UTILISE LE FORMAT LISTE AVEC TIRETS ET RETOURS À LA LIGNE (\n)
- Si 1 ou 2 ingrédients → Phrase simple sans liste
- NE JAMAIS écrire "X, Y, Z, W et V" pour 3+ ingrédients
- TOUJOURS écrire "Texte :\n- X\n- Y\n- Z\n- W\n- V\n\nConclusion"

Exemple de texte d'étape correct pour 7 ingrédients :
"Mélanger tous les ingrédients pour la sauce :\n- 2 c.à.s d'eau\n- 2 c.à.s de sucre blond\n- 2 c.à.s de sauce soya salé\n- 1 c.à.s de vinaigre de riz\n- 1 c.à.s d'huile de sésame\n- 2 c.à.s de maïzéna\n- 0.5 c.à.c de sauce pimentée\n\nBien mélanger jusqu'à homogénéité."`;

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

    // Appeler ChatGPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ou "gpt-3.5-turbo" pour être plus économique
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
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
