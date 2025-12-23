import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseGPTJson } from "@/lib/chatgpt-helpers";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Arrondit un temps au multiple de 5 le plus proche
 */
function roundToMultipleOf5(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

/**
 * Récupère une image de haute qualité depuis Unsplash avec métadonnées pour attribution
 * @param recipeName - Nom de la recette pour la recherche
 * @returns Objet avec URL de l'image et métadonnées Unsplash, ou null
 */
async function fetchRecipeImage(recipeName: string): Promise<{
  imageUrl: string;
  unsplashData?: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    downloadLocation: string;
  };
} | null> {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (accessKey) {
      // Version avec clé API (meilleure qualité et contrôle)
      const searchQuery = encodeURIComponent(`${recipeName} food dish`);
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${accessKey}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const photo = data.results[0];
          const imageUrl = photo.urls.regular;
          
          // Données nécessaires pour l'attribution Unsplash
          const unsplashData = {
            photographerName: photo.user.name,
            photographerUsername: photo.user.username,
            photographerUrl: `https://unsplash.com/@${photo.user.username}?utm_source=yumiso&utm_medium=referral`,
            downloadLocation: photo.links.download_location, // Pour envoyer la requête de download
          };
          
          console.log(`📸 Image Unsplash récupérée pour "${recipeName}" par ${unsplashData.photographerName}`);
          return { imageUrl, unsplashData };
        }
      }
    }
    
    // Fallback: utiliser l'API publique sans clé (pas d'attribution requise pour ce endpoint)
    const query = recipeName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').slice(0, 3).join(',');
    const fallbackUrl = `https://source.unsplash.com/1600x900/?food,${query},dish,meal`;
    console.log(`📸 Image Unsplash fallback pour "${recipeName}"`);
    return { imageUrl: fallbackUrl };
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'image:", error);
    return { imageUrl: "https://source.unsplash.com/1600x900/?food,dish,meal" };
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, dayOfWeek, timeSlot, mealType, prompt } = body;

    // Récupérer le plan pour connaître le nombre de personnes
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    const aiPrompt = `Génère une recette complète et détaillée pour "${prompt}".

**Contraintes :**
- Type de repas : ${mealType}
- Pour ${plan.numberOfPeople} personnes
- Les temps de préparation et cuisson DOIVENT être des multiples de 5 (ex: 5, 10, 15, 20, 25, 30, etc.)

**Format JSON STRICT :**
{
  "name": "Nom du plat",
  "prepTime": 15,
  "cookTime": 30,
  "servings": ${plan.numberOfPeople},
  "calories": 450,
  "ingredients": [
    "200g de poulet",
    "1 oignon émincé",
    "2 gousses d'ail",
    "150ml de crème fraîche",
    "sel et poivre"
  ],
  "steps": [
    "Préchauffer le four à 180°C.",
    "Couper le poulet en morceaux et assaisonner.",
    "Faire revenir l'oignon et l'ail dans une poêle.",
    "Ajouter le poulet et faire dorer 5 minutes.",
    "Verser la crème et laisser mijoter 10 minutes.",
    "Servir chaud avec du riz ou des pâtes."
  ]
}

**IMPORTANT :**
- Donne des instructions DÉTAILLÉES pour chaque étape
- Inclus les quantités précises pour chaque ingrédient
- Les temps doivent être des multiples de 5`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un chef cuisinier expert. Tu génères des recettes complètes et détaillées en JSON valide uniquement, sans texte avant ou après. Les instructions doivent être claires et précises avec des étapes bien détaillées.",
        },
        {
          role: "user",
          content: aiPrompt,
        },
      ],
      temperature: 0.8,
      max_completion_tokens: 15000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    const recipeData = parseGPTJson(content);

    // Arrondir les temps au multiple de 5 le plus proche
    const prepTime = roundToMultipleOf5(recipeData.prepTime || 0);
    const cookTime = roundToMultipleOf5(recipeData.cookTime || 0);

    // Récupérer une image de haute qualité pour la recette
    const imageData = await fetchRecipeImage(recipeData.name);

    // Créer le repas
    const meal = await db.plannedMeal.create({
      data: {
        weeklyMealPlanId: planId,
        dayOfWeek,
        timeSlot,
        mealType,
        name: recipeData.name,
        prepTime,
        cookTime,
        servings: recipeData.servings || plan.numberOfPeople,
        calories: recipeData.calories || null,
        portionsUsed: recipeData.servings || 1,
        ingredients: recipeData.ingredients || [],
        steps: recipeData.steps || [],
        isUserRecipe: false,
        imageUrl: imageData?.imageUrl, // Ajouter l'URL de l'image
        // Stocker les métadonnées Unsplash pour l'attribution
        unsplashData: imageData?.unsplashData ? JSON.stringify(imageData.unsplashData) : null,
      },
    });

    return NextResponse.json(meal);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la génération" },
      { status: 500 }
    );
  }
}
