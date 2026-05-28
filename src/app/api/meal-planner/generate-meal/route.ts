import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseGPTJson } from "@/lib/chatgpt-helpers";
import { checkUserPremium } from "@/lib/premium";

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
 * Traduit le nom d'une recette en anglais pour amÃ©liorer les rÃ©sultats de recherche Unsplash
 * @param recipeName - Nom de la recette en franÃ§ais
 * @returns Nom traduit en anglais
 */
async function translateToEnglish(recipeName: string): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content: "You are a translator. Translate the recipe name from French to English. Reply ONLY with the translation, nothing else. Keep it short and natural for food photography search."
        },
        {
          role: "user",
          content: recipeName
        }
      ],
      temperature: 1,
      max_completion_tokens: 1000,
    });

    const translation = response.choices[0]?.message?.content?.trim();
    if (translation) {
      console.log(`ðŸŒ Traduction: "${recipeName}" â†’ "${translation}"`);
      return translation;
    }

    // Fallback si pas de traduction
    return recipeName;
  } catch (error) {
    console.error("âŒ Erreur lors de la traduction:", error);
    // En cas d'erreur, retourner le nom original
    return recipeName;
  }
}

/**
 * RÃ©cupÃ¨re une image de haute qualitÃ© depuis Unsplash avec mÃ©tadonnÃ©es pour attribution
 * @param recipeName - Nom de la recette (pour les logs)
 * @param recipeNameEnglish - Nom traduit en anglais pour la recherche
 * @returns Objet avec URL de l'image et mÃ©tadonnÃ©es Unsplash, ou null
 */
async function fetchRecipeImage(recipeName: string, recipeNameEnglish: string): Promise<{
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
      // Version avec clÃ© API (meilleure qualitÃ© et contrÃ´le)
      const searchQuery = encodeURIComponent(`${recipeNameEnglish} food dish`);
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

          // DonnÃ©es nÃ©cessaires pour l'attribution Unsplash
          const unsplashData = {
            photographerName: photo.user.name,
            photographerUsername: photo.user.username,
            photographerUrl: `https://unsplash.com/@${photo.user.username}?utm_source=yumiso&utm_medium=referral`,
            downloadLocation: photo.links.download_location, // Pour envoyer la requÃªte de download
          };

          console.log(`ðŸ“¸ Image Unsplash rÃ©cupÃ©rÃ©e pour "${recipeName}" (${recipeNameEnglish}) par ${unsplashData.photographerName}`);
          return { imageUrl, unsplashData };
        }
      }
    }

    // Fallback: utiliser l'API publique sans clÃ© (pas d'attribution requise pour ce endpoint)
    const query = recipeName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').slice(0, 3).join(',');
    const fallbackUrl = `https://source.unsplash.com/1600x900/?food,${query},dish,meal`;
    console.log(`ðŸ“¸ Image Unsplash fallback pour "${recipeName}"`);
    return { imageUrl: fallbackUrl };

  } catch (error) {
    console.error("âŒ Erreur lors de la rÃ©cupÃ©ration de l'image:", error);
    return { imageUrl: "https://source.unsplash.com/1600x900/?food,dish,meal" };
  }
}

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
    const { planId, dayOfWeek, timeSlot, mealType, prompt } = body;

    // RÃ©cupÃ©rer le plan pour connaÃ®tre le nombre de personnes
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvÃ©" }, { status: 404 });
    }

    const aiPrompt = `GÃ©nÃ¨re une recette complÃ¨te et dÃ©taillÃ©e pour "${prompt}".

**Contraintes :**
- Type de repas : ${mealType}
- Pour ${plan.numberOfPeople} personnes
- Les temps de prÃ©paration et cuisson DOIVENT Ãªtre des multiples de 5 (ex: 5, 10, 15, 20, 25, 30, etc.)

**Format JSON STRICT :**
{
  "name": "Nom du plat",
  "prepTime": 15,
  "cookTime": 30,
  "servings": ${plan.numberOfPeople},
  "calories": 450,
  "ingredients": [
    "200g de poulet",
    "1 oignon Ã©mincÃ©",
    "2 gousses d'ail",
    "150ml de crÃ¨me fraÃ®che",
    "sel et poivre"
  ],
  "steps": [
    "PrÃ©chauffer le four Ã  180Â°C.",
    "Couper le poulet en morceaux et assaisonner.",
    "Faire revenir l'oignon et l'ail dans une poÃªle.",
    "Ajouter le poulet et faire dorer 5 minutes.",
    "Verser la crÃ¨me et laisser mijoter 10 minutes.",
    "Servir chaud avec du riz ou des pÃ¢tes."
  ]
}

**IMPORTANT :**
- Donne des instructions DÃ‰TAILLÃ‰ES pour chaque Ã©tape
- Inclus les quantitÃ©s prÃ©cises pour chaque ingrÃ©dient
- Les temps doivent Ãªtre des multiples de 5`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un chef cuisinier expert. Tu gÃ©nÃ¨res des recettes complÃ¨tes et dÃ©taillÃ©es en JSON valide uniquement, sans texte avant ou aprÃ¨s. Les instructions doivent Ãªtre claires et prÃ©cises avec des Ã©tapes bien dÃ©taillÃ©es.",
        },
        {
          role: "user",
          content: aiPrompt,
        },
      ],
      temperature: 1,
      max_completion_tokens: 15000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de rÃ©ponse de ChatGPT");
    }

    const recipeData = parseGPTJson(content);

    // Arrondir les temps au multiple de 5 le plus proche
    const prepTime = roundToMultipleOf5(recipeData.prepTime || 0);
    const cookTime = roundToMultipleOf5(recipeData.cookTime || 0);

    // Traduire le nom en anglais puis rÃ©cupÃ©rer une image de haute qualitÃ©
    const recipeNameEnglish = await translateToEnglish(recipeData.name);
    const imageData = await fetchRecipeImage(recipeData.name, recipeNameEnglish);

    // CrÃ©er le repas
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
        // Stocker les mÃ©tadonnÃ©es Unsplash pour l'attribution
        unsplashData: imageData?.unsplashData ? JSON.stringify(imageData.unsplashData) : null,
      },
    });

    return NextResponse.json(meal);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la gÃ©nÃ©ration" },
      { status: 500 }
    );
  }
}
