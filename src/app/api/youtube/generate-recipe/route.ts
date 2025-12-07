import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import OpenAI from "openai";
import type { Category, CostEstimate } from "@/types/recipe";

const SYSTEM_PROMPT = `Tu es un assistant culinaire expert qui convertit des transcriptions de vidéos YouTube de recettes en recettes structurées.

Tu dois analyser la transcription et la description de la vidéo et extraire :
- Le nom de la recette
- Une description courte et appétissante
- La catégorie (MAIN_DISH, STARTER, DESSERT, SIDE_DISH, SOUP, SALAD, BEVERAGE, SNACK)
- L'auteur/chef si mentionné
- Le temps de préparation (en minutes)
- Le temps de cuisson (en minutes)
- Le nombre de portions
- L'estimation du coût (CHEAP, MEDIUM, EXPENSIVE)
- La note (sur 5)
- Les tags/mots-clés pertinents
- Les ingrédients avec quantités et unités
- Les groupes d'ingrédients SI ET SEULEMENT SI la recette a des parties distinctes (ex: pâte/garniture, base/sauce, etc.)
- Les étapes de préparation numérotées

IMPORTANT pour les groupes d'ingrédients :
- N'utilise les groupes d'ingrédients QUE si la recette a vraiment des parties distinctes
- Par exemple : "Pâte", "Garniture", "Sauce", "Base", "Topping", etc.
- Si c'est une recette simple avec une seule liste d'ingrédients, utilise "ingredients" sans "ingredientGroups"
- Si tu utilises "ingredientGroups", ne remplis PAS le champ "ingredients"

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
  "rating": 4.5,
  "tags": ["tag1", "tag2"],
  "ingredientGroups": [
    {
      "name": "Pâte",
      "ingredients": [
        { "name": "farine", "quantity": 250, "unit": "g" },
        { "name": "eau", "quantity": 120, "unit": "ml" }
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
    { "order": 1, "text": "Première étape" },
    { "order": 2, "text": "Deuxième étape" }
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
  "rating": 4.5,
  "tags": ["tag1", "tag2"],
  "ingredients": [
    { "name": "farine", "quantity": 250, "unit": "g" },
    { "name": "eau", "quantity": 120, "unit": "ml" },
    { "name": "sel", "quantity": 1, "unit": "c.à.c" }
  ],
  "steps": [
    { "order": 1, "text": "Première étape" },
    { "order": 2, "text": "Deuxième étape" }
  ]
}

Assure-toi que :
- Les quantités sont des nombres (ou null si non spécifié)
- Les unités courantes : g, kg, ml, l, c.à.s, c.à.c, pincée, etc.
- Les étapes sont claires et numérotées dans l'ordre
- La catégorie correspond exactement à l'une des valeurs autorisées
- Le temps est en minutes
- N'invente pas d'informations qui ne sont pas dans la transcription`;

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

    const { title, description, transcript, videoUrl, imageUrl } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: "La transcription est requise" },
        { status: 400 }
      );
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

Description:
${description}

Transcription:
${transcript.slice(0, 8000)} ${transcript.length > 8000 ? "..." : ""}

Analyse cette vidéo de recette et extrais toutes les informations pertinentes pour créer une recette structurée.`;

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
      author: recipe.author || "YouTube",
      preparationTime: Number(recipe.preparationTime) || 0,
      cookingTime: Number(recipe.cookingTime) || 0,
      servings: Number(recipe.servings) || 4,
      costEstimate: (recipe.costEstimate || "MEDIUM") as CostEstimate,
      rating: Number(recipe.rating) || 4,
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
