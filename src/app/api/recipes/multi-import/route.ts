import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface ImportResult {
  success: boolean;
  recipeName?: string;
  url: string;
  error?: string;
  index: number; // Pour maintenir l'ordre
}

interface ImportResponse {
  successful: ImportResult[];
  failed: ImportResult[];
  totalProcessed: number;
}

// Configuration du pool de workers parallèles
// ⚙️ Optimisé pour Vercel gratuit (timeout 10s) et éviter le rate limiting YouTube/OpenAI
const MAX_CONCURRENT_IMPORTS = 3; // 3 recettes en parallèle = 6 requêtes API simultanées max
const DELAY_BETWEEN_BATCHES = 1000; // 1 seconde entre chaque batch pour éviter le rate limiting

// Helper pour extraire le videoId d'une URL YouTube
function extractYoutubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Format: youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }
    
    // Format: youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1); // Enlever le "/" initial
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Traite une seule URL d'import
 */
async function processImport(
  url: string,
  index: number,
  baseUrl: string,
  cookieHeader: string
): Promise<ImportResult> {
  console.log(`[Multi-Import] [${index + 1}] Début traitement de ${url}`);

  try {
    // Détecter le type de plateforme
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

    if (isYouTube) {
      // Pour YouTube : 2 étapes (transcription + génération)
      console.log(`[Multi-Import] [${index + 1}] YouTube - Étape 1/2: Extraction transcription`);
      
      // Extraire le videoId de l'URL
      const videoId = extractYoutubeVideoId(url);
      if (!videoId) {
        throw new Error('URL YouTube invalide - impossible d\'extraire le videoId');
      }
      
      // Étape 1: Obtenir la transcription
      const transcriptRes = await fetch(`${baseUrl}/api/youtube/transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
        },
        body: JSON.stringify({ videoId }),
      });

      if (!transcriptRes.ok) {
        const errorData = await transcriptRes.json().catch(() => ({ error: 'Erreur transcription' }));
        throw new Error(errorData.error || 'Erreur lors de la transcription YouTube');
      }

      const transcriptData = await transcriptRes.json();
      const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      console.log(`[Multi-Import] [${index + 1}] YouTube - Étape 2/2: Génération recette`);

      // Étape 2: Générer la recette avec GPT
      const recipeRes = await fetch(`${baseUrl}/api/youtube/generate-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
        },
        body: JSON.stringify({
          title: transcriptData.title,
          description: transcriptData.description,
          transcript: transcriptData.transcript,
          videoUrl: url,
          imageUrl: imageUrl,
          author: transcriptData.author,
        }),
      });

      if (!recipeRes.ok) {
        const errorData = await recipeRes.json().catch(() => ({ error: 'Erreur génération' }));
        throw new Error(errorData.error || 'Erreur lors de la génération de la recette');
      }

      const recipeData = await recipeRes.json();
      recipeName = recipeData.recipe?.name || "Recette YouTube importée";

    } else if (isTikTok) {
      // Pour TikTok : 2 étapes (extraction + génération)
      console.log(`[Multi-Import] [${index + 1}] TikTok - Étape 1/2: Extraction métadonnées`);
      
      const extractRes = await fetch(`${baseUrl}/api/tiktok/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
        },
        body: JSON.stringify({ videoUrl: url }),
      });

      if (!extractRes.ok) {
        const errorData = await extractRes.json().catch(() => ({ error: 'Erreur extraction' }));
        throw new Error(errorData.error || 'Erreur lors de l\'extraction TikTok');
      }

      const tiktokData = await extractRes.json();
      
      console.log(`[Multi-Import] [${index + 1}] TikTok - Étape 2/2: Génération recette`);

      const recipeRes = await fetch(`${baseUrl}/api/youtube/generate-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
        },
        body: JSON.stringify({
          title: tiktokData.title,
          description: tiktokData.description,
          transcript: tiktokData.description,
          videoUrl: url,
          imageUrl: tiktokData.thumbnail || '',
          author: tiktokData.author,
        }),
      });

      if (!recipeRes.ok) {
        const errorData = await recipeRes.json().catch(() => ({ error: 'Erreur génération' }));
        throw new Error(errorData.error || 'Erreur lors de la génération de la recette');
      }

      const recipeData = await recipeRes.json();
      recipeName = recipeData.recipe?.name || "Recette TikTok importée";
    }

    console.log(`[Multi-Import] [${index + 1}] ✅ ${recipeName} importée avec succès`);

    return {
      success: true,
      recipeName,
      url,
      index,
    };

  } catch (error) {
    console.error(`[Multi-Import] [${index + 1}] ❌ Erreur pour ${url}:`, error);
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
  cookieHeader: string
): Promise<ImportResult[]> {
  const promises = urls.map((url, i) => 
    processImport(url, startIndex + i, baseUrl, cookieHeader)
  );
  
  return await Promise.all(promises);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { urls } = await request.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Aucune URL fournie" },
        { status: 400 }
      );
    }

    if (urls.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 recettes par import" },
        { status: 400 }
      );
    }

    console.log(`[Multi-Import] 🚀 Début import parallèle de ${urls.length} recettes pour ${session.user.pseudo || session.user.name}`);
    console.log(`[Multi-Import] Configuration: ${MAX_CONCURRENT_IMPORTS} recettes en parallèle`);

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const cookieHeader = request.headers.get('cookie') || '';
    const allResults: ImportResult[] = [];

    // Diviser les URLs en batches pour traitement parallèle
    for (let i = 0; i < urls.length; i += MAX_CONCURRENT_IMPORTS) {
      const batch = urls.slice(i, i + MAX_CONCURRENT_IMPORTS);
      const batchNumber = Math.floor(i / MAX_CONCURRENT_IMPORTS) + 1;
      const totalBatches = Math.ceil(urls.length / MAX_CONCURRENT_IMPORTS);
      
      console.log(`[Multi-Import] 📦 Batch ${batchNumber}/${totalBatches}: ${batch.length} recettes en parallèle`);
      
      const batchResults = await processBatch(batch, i, baseUrl, cookieHeader);
      allResults.push(...batchResults);
      
      // Petit délai entre les batches pour ne pas surcharger
      if (i + MAX_CONCURRENT_IMPORTS < urls.length) {
        console.log(`[Multi-Import] ⏳ Pause de ${DELAY_BETWEEN_BATCHES}ms avant le prochain batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Trier les résultats par index pour maintenir l'ordre
    allResults.sort((a, b) => a.index - b.index);

    const successful = allResults.filter(r => r.success);
    const failed = allResults.filter(r => !r.success);

    console.log(`[Multi-Import] ✅ Terminé: ${successful.length} succès, ${failed.length} échecs sur ${urls.length} total`);

    const results: ImportResponse = {
      successful,
      failed,
      totalProcessed: allResults.length,
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error("[Multi-Import] ❌ Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'import multiple" },
      { status: 500 }
    );
  }
}
