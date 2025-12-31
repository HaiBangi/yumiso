import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slug-helpers";
import { revalidatePath } from "next/cache";

interface ImportResult {
  success: boolean;
  recipeName?: string;
  url: string;
  error?: string;
  index: number;
}

interface ImportResponse {
  successful: ImportResult[];
  failed: ImportResult[];
  totalProcessed: number;
}

// Configuration
const MAX_CONCURRENT_IMPORTS = 3;
const DELAY_BETWEEN_BATCHES = 1000;

// Helper pour extraire le videoId d'une URL YouTube
function extractYoutubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sauvegarde une recette en base de données
 */
async function saveRecipeToDatabase(
  recipe: {
    name: string;
    description?: string | null;
    category: string;
    author: string;
    preparationTime: number;
    cookingTime: number;
    servings: number;
    caloriesPerServing?: number | null;
    costEstimate?: string;
    rating?: number;
    tags?: string[];
    imageUrl?: string | null;
    videoUrl?: string | null;
    ingredients?: Array<{ name: string; quantity: number | null; unit: string | null }>;
    ingredientGroups?: Array<{ name: string; ingredients: Array<{ name: string; quantity: number | null; unit: string | null }> }>;
    steps?: Array<{ order: number; text: string }>;
  },
  userId: string
): Promise<{ id: number; slug: string }> {
  const slug = await generateUniqueSlug(recipe.name);

  const createdRecipe = await db.recipe.create({
    data: {
      name: recipe.name,
      slug,
      description: recipe.description || null,
      category: (recipe.category || "MAIN_DISH") as "MAIN_DISH" | "STARTER" | "SIDE_DISH" | "SOUP" | "SALAD" | "DESSERT" | "CAKE" | "PASTRY" | "COOKIE" | "BREAKFAST" | "BRUNCH" | "SNACK" | "APPETIZER" | "BEVERAGE" | "SMOOTHIE" | "COCKTAIL" | "SAUCE" | "MARINADE" | "DRESSING" | "SPREAD" | "BREAD" | "PRESERVES" | "OTHER",
      author: recipe.author,
      preparationTime: recipe.preparationTime || 0,
      cookingTime: recipe.cookingTime || 0,
      servings: recipe.servings || 4,
      caloriesPerServing: recipe.caloriesPerServing || null,
      costEstimate: (recipe.costEstimate as "CHEAP" | "MEDIUM" | "EXPENSIVE") || "MEDIUM",
      rating: recipe.rating || 0,
      imageUrl: recipe.imageUrl || null,
      videoUrl: recipe.videoUrl || null,
      tags: recipe.tags || [],
      userId,
      steps: {
        create: (recipe.steps || []).map((step, idx) => ({
          order: step.order || idx + 1,
          text: step.text,
        })),
      },
    },
  });

  // Créer les groupes d'ingrédients ou les ingrédients simples
  if (recipe.ingredientGroups && recipe.ingredientGroups.length > 0) {
    for (let i = 0; i < recipe.ingredientGroups.length; i++) {
      const group = recipe.ingredientGroups[i];
      await db.ingredientGroup.create({
        data: {
          name: group.name,
          order: i,
          recipeId: createdRecipe.id,
          ingredients: {
            create: group.ingredients.map((ing, ingIndex) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              order: ingIndex,
              recipeId: createdRecipe.id,
            })),
          },
        },
      });
    }
  } else if (recipe.ingredients && recipe.ingredients.length > 0) {
    await db.ingredient.createMany({
      data: recipe.ingredients.map((ing, index) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        order: index,
        recipeId: createdRecipe.id,
      })),
    });
  }

  return { id: createdRecipe.id, slug };
}

/**
 * Traite une seule URL d'import
 */
async function processImport(
  url: string,
  index: number,
  baseUrl: string,
  cookieHeader: string,
  userId: string
): Promise<ImportResult> {
  console.log(`[Multi-Import] [${index + 1}] 🚀 Début traitement de ${url}`);

  try {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isTikTok = url.includes('tiktok.com');

    if (!isYouTube && !isTikTok) {
      return {
        success: false,
        url,
        error: "URL non supportée (YouTube ou TikTok uniquement)",
        index,
      };
    }

    let recipeName = "Recette importée";
    let imageUrl = "";

    if (isYouTube) {
      const videoId = extractYoutubeVideoId(url);
      console.log(`[Multi-Import] [${index + 1}] 📹 VideoId: ${videoId}`);

      if (!videoId) {
        throw new Error('URL YouTube invalide');
      }

      // Étape 1: Transcription
      console.log(`[Multi-Import] [${index + 1}] YouTube - Étape 1/3: Transcription`);
      const transcriptRes = await fetch(`${baseUrl}/api/youtube/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
        body: JSON.stringify({ videoId }),
      });

      if (!transcriptRes.ok) {
        const errorData = await transcriptRes.json().catch(() => ({ error: 'Erreur transcription' }));
        throw new Error(errorData.error || 'Erreur transcription');
      }

      const transcriptData = await transcriptRes.json();
      imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      // Étape 2: Génération avec ChatGPT
      console.log(`[Multi-Import] [${index + 1}] YouTube - Étape 2/3: Génération recette`);
      const recipeRes = await fetch(`${baseUrl}/api/youtube/generate-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
        body: JSON.stringify({
          title: transcriptData.title,
          description: transcriptData.description,
          transcript: transcriptData.transcript,
          videoUrl: url,
          imageUrl,
          author: transcriptData.author,
        }),
      });

      if (!recipeRes.ok) {
        const errorData = await recipeRes.json().catch(() => ({ error: 'Erreur génération' }));
        throw new Error(errorData.error || 'Erreur génération');
      }

      const recipeData = await recipeRes.json();
      const generatedRecipe = recipeData.recipe;

      if (!generatedRecipe) {
        throw new Error('Recette non générée');
      }

      recipeName = generatedRecipe.name || "Recette YouTube";

      // Étape 3: Sauvegarde en base
      console.log(`[Multi-Import] [${index + 1}] YouTube - Étape 3/3: Sauvegarde BDD`);
      const savedRecipe = await saveRecipeToDatabase({
        ...generatedRecipe,
        videoUrl: url,
        imageUrl,
      }, userId);

      console.log(`[Multi-Import] [${index + 1}] ✅ "${recipeName}" sauvegardée (id: ${savedRecipe.id})`);

    } else if (isTikTok) {
      // Étape 1: Extraction TikTok
      console.log(`[Multi-Import] [${index + 1}] TikTok - Étape 1/3: Extraction`);
      const extractRes = await fetch(`${baseUrl}/api/tiktok/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
        body: JSON.stringify({ videoUrl: url }),
      });

      if (!extractRes.ok) {
        const errorData = await extractRes.json().catch(() => ({ error: 'Erreur extraction' }));
        throw new Error(errorData.error || 'Erreur extraction TikTok');
      }

      const tiktokData = await extractRes.json();
      imageUrl = tiktokData.thumbnail || '';

      // Étape 2: Génération
      console.log(`[Multi-Import] [${index + 1}] TikTok - Étape 2/3: Génération recette`);
      const recipeRes = await fetch(`${baseUrl}/api/youtube/generate-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
        body: JSON.stringify({
          title: tiktokData.title,
          description: tiktokData.description,
          transcript: tiktokData.description,
          videoUrl: url,
          imageUrl,
          author: tiktokData.author,
        }),
      });

      if (!recipeRes.ok) {
        const errorData = await recipeRes.json().catch(() => ({ error: 'Erreur génération' }));
        throw new Error(errorData.error || 'Erreur génération');
      }

      const recipeData = await recipeRes.json();
      const generatedRecipe = recipeData.recipe;

      if (!generatedRecipe) {
        throw new Error('Recette non générée');
      }

      recipeName = generatedRecipe.name || "Recette TikTok";

      // Étape 3: Sauvegarde
      console.log(`[Multi-Import] [${index + 1}] TikTok - Étape 3/3: Sauvegarde BDD`);
      const savedRecipe = await saveRecipeToDatabase({
        ...generatedRecipe,
        videoUrl: url,
        imageUrl,
      }, userId);

      console.log(`[Multi-Import] [${index + 1}] ✅ "${recipeName}" sauvegardée (id: ${savedRecipe.id})`);
    }

    return { success: true, recipeName, url, index };

  } catch (error) {
    console.error(`[Multi-Import] [${index + 1}] ❌ Erreur:`, error);
    return {
      success: false,
      url,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      index,
    };
  }
}

/**
 * Traite un batch d'URLs en parallèle
 */
async function processBatch(
  urls: string[],
  startIndex: number,
  baseUrl: string,
  cookieHeader: string,
  userId: string
): Promise<ImportResult[]> {
  const promises = urls.map((url, i) =>
    processImport(url, startIndex + i, baseUrl, cookieHeader, userId)
  );

  return await Promise.all(promises);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { urls } = await request.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "Aucune URL fournie" }, { status: 400 });
    }

    if (urls.length > 20) {
      return NextResponse.json({ error: "Maximum 20 recettes" }, { status: 400 });
    }

    console.log(`[Multi-Import] 🚀 Début import de ${urls.length} recettes`);

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const cookieHeader = request.headers.get('cookie') || '';
    const allResults: ImportResult[] = [];

    for (let i = 0; i < urls.length; i += MAX_CONCURRENT_IMPORTS) {
      const batch = urls.slice(i, i + MAX_CONCURRENT_IMPORTS);
      const batchNumber = Math.floor(i / MAX_CONCURRENT_IMPORTS) + 1;
      const totalBatches = Math.ceil(urls.length / MAX_CONCURRENT_IMPORTS);

      console.log(`[Multi-Import] 📦 Batch ${batchNumber}/${totalBatches}`);

      const batchResults = await processBatch(batch, i, baseUrl, cookieHeader, session.user.id);
      allResults.push(...batchResults);

      if (i + MAX_CONCURRENT_IMPORTS < urls.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    allResults.sort((a, b) => a.index - b.index);

    const successful = allResults.filter(r => r.success);
    const failed = allResults.filter(r => !r.success);

    console.log(`[Multi-Import] ✅ Terminé: ${successful.length} succès, ${failed.length} échecs`);

    // Revalider les pages
    if (successful.length > 0) {
      revalidatePath("/recipes");
      revalidatePath("/profile/recipes");
    }

    return NextResponse.json({
      successful,
      failed,
      totalProcessed: allResults.length,
    });

  } catch (error) {
    console.error("[Multi-Import] ❌ Erreur:", error);
    return NextResponse.json({ error: "Erreur import" }, { status: 500 });
  }
}
