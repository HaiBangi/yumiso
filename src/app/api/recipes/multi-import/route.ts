import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface ImportResult {
  success: boolean;
  recipeName?: string;
  url: string;
  error?: string;
}

interface ImportResponse {
  successful: ImportResult[];
  failed: ImportResult[];
  totalProcessed: number;
}

// Helper pour attendre entre les requêtes
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    const results: ImportResponse = {
      successful: [],
      failed: [],
      totalProcessed: 0,
    };

    console.log(`[Multi-Import] Début de l'import de ${urls.length} recettes pour ${session.user.pseudo || session.user.name}`);

    // Traiter chaque URL séquentiellement pour éviter de surcharger l'API
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      results.totalProcessed++;
      
      console.log(`[Multi-Import] [${i + 1}/${urls.length}] Traitement de ${url}`);

      try {
        // Détecter le type de plateforme
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        const isTikTok = url.includes('tiktok.com');

        if (!isYouTube && !isTikTok) {
          results.failed.push({
            success: false,
            url,
            error: "URL non supportée (YouTube ou TikTok uniquement)",
          });
          continue;
        }

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        let recipeName = "Recette importée";

        if (isYouTube) {
          // Pour YouTube : 2 étapes (transcription + génération)
          console.log(`[Multi-Import] YouTube - Étape 1/2: Extraction de la transcription...`);
          
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
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({ videoId }),
          });

          if (!transcriptRes.ok) {
            const errorData = await transcriptRes.json().catch(() => ({ error: 'Erreur transcription' }));
            throw new Error(errorData.error || 'Erreur lors de la transcription YouTube');
          }

          const transcriptData = await transcriptRes.json();
          
          // Construire l'imageUrl à partir du videoId
          const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          
          console.log(`[Multi-Import] YouTube - Étape 2/2: Génération de la recette avec GPT...`);

          // Étape 2: Générer la recette avec GPT
          const recipeRes = await fetch(`${baseUrl}/api/youtube/generate-recipe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
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
          // Pour TikTok : 2 étapes comme YouTube (extraction PUIS génération)
          console.log(`[Multi-Import] TikTok - Étape 1/2: Extraction des métadonnées...`);
          
          // Étape 1: Extraire les métadonnées TikTok
          const extractRes = await fetch(`${baseUrl}/api/tiktok/extract`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({ videoUrl: url }),
          });

          if (!extractRes.ok) {
            const errorData = await extractRes.json().catch(() => ({ error: 'Erreur extraction' }));
            throw new Error(errorData.error || 'Erreur lors de l\'extraction TikTok');
          }

          const tiktokData = await extractRes.json();
          
          console.log(`[Multi-Import] TikTok - Étape 2/2: Génération de la recette avec GPT...`);

          // Étape 2: Générer la recette avec GPT (utiliser la même API que YouTube mais adapter)
          const recipeRes = await fetch(`${baseUrl}/api/youtube/generate-recipe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              title: tiktokData.title,
              description: tiktokData.description,
              transcript: tiktokData.description, // TikTok utilise description comme transcription
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

        results.successful.push({
          success: true,
          recipeName,
          url,
        });

        console.log(`[Multi-Import] ✅ ${recipeName} importée avec succès`);

        // Attendre 3 secondes entre chaque import (car YouTube = 2 appels API)
        if (i < urls.length - 1) {
          await delay(3000);
        }

      } catch (error) {
        console.error(`[Multi-Import] ❌ Erreur pour ${url}:`, error);
        results.failed.push({
          success: false,
          url,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }

    console.log(`[Multi-Import] Terminé: ${results.successful.length} succès, ${results.failed.length} échecs`);

    return NextResponse.json(results);

  } catch (error) {
    console.error("[Multi-Import] Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'import multiple" },
      { status: 500 }
    );
  }
}
