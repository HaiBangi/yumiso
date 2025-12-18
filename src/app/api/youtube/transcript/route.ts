import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache, cacheKeys } from "@/lib/cache";

/**
 * Récupère la transcription d'une vidéo YouTube
 * Utilise ytInitialPlayerResponse et force le format JSON pour éviter le XML vide
 */
async function getYoutubeTranscript(videoId: string): Promise<string> {
  const cacheKey = cacheKeys.youtubeTranscript(videoId);
  const cached = cache.get<string>(cacheKey);
  if (cached) {
    console.log(`[Transcript] ✅ Cache hit pour ${videoId}`);
    return cached;
  }

  console.log(`[Transcript] Récupération pour ${videoId}`);

  try {
    // Récupérer la page YouTube
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    const pageHtml = await pageResponse.text();

    // Extraire ytInitialPlayerResponse
    const playerResponseMatch = pageHtml.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
    
    if (!playerResponseMatch) {
      throw new Error("Impossible d'extraire les données de la vidéo");
    }

    const playerData = JSON.parse(playerResponseMatch[1]);
    
    if (!playerData.captions) {
      throw new Error(
        "Cette vidéo n'a pas de sous-titres disponibles. " +
        "Le créateur doit activer les sous-titres."
      );
    }

    const captionTracks = playerData.captions.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captionTracks || captionTracks.length === 0) {
      throw new Error("Aucune piste de sous-titres trouvée");
    }

    console.log(`[Transcript] ${captionTracks.length} piste(s) trouvée(s)`);

    // Sélectionner FR > EN > première
    interface CaptionTrack {
      baseUrl: string;
      languageCode: string;
    }

    let selectedTrack: CaptionTrack = captionTracks.find((t: CaptionTrack) => 
      t.languageCode === 'fr' || t.languageCode?.startsWith('fr')
    );
    
    if (!selectedTrack) {
      selectedTrack = captionTracks.find((t: CaptionTrack) => 
        t.languageCode === 'en' || t.languageCode?.startsWith('en')
      );
    }
    
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    console.log(`[Transcript] Langue: ${selectedTrack.languageCode}`);

    // ASTUCE: Forcer le format JSON au lieu de XML
    let subtitleUrl = selectedTrack.baseUrl;
    
    // Ajouter &fmt=json3 pour obtenir du JSON au lieu de XML
    if (!subtitleUrl.includes('fmt=')) {
      subtitleUrl += '&fmt=json3';
    }
    
    console.log(`[Transcript] URL: ${subtitleUrl.substring(0, 120)}...`);
    
    const subtitleResponse = await fetch(subtitleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const contentType = subtitleResponse.headers.get('content-type') || '';
    console.log(`[Transcript] Content-Type: ${contentType}`);
    
    if (!subtitleResponse.ok) {
      throw new Error(`Erreur HTTP ${subtitleResponse.status}`);
    }

    const subtitleData = await subtitleResponse.text();
    console.log(`[Transcript] Données reçues: ${subtitleData.length} caractères`);

    if (subtitleData.length === 0) {
      throw new Error("Réponse vide du serveur YouTube");
    }

    // Parser JSON ou XML selon le format
    let fullText = "";
    
    if (contentType.includes('json') || subtitleUrl.includes('json')) {
      // Format JSON
      console.log(`[Transcript] Format: JSON`);
      const jsonData = JSON.parse(subtitleData);
      
      if (jsonData.events) {
        fullText = jsonData.events
          .filter((event: { segs?: unknown[] }) => event.segs)
          .map((event: { segs: { utf8?: string }[] }) => 
            event.segs.map(seg => seg.utf8 || '').join('')
          )
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } else {
      // Format XML (fallback)
      console.log(`[Transcript] Format: XML`);
      const textMatches = Array.from(subtitleData.matchAll(/<text[^>]*>([^<]*)<\/text>/g));
      fullText = textMatches
        .map(m => m[1])
        .map(text => text
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&#39;/g, "'")
          .trim()
        )
        .filter(text => text.length > 0)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (fullText.length === 0) {
      console.error(`[Transcript] Données brutes:`, subtitleData.substring(0, 500));
      throw new Error("Impossible d'extraire le texte des sous-titres");
    }

    console.log(`[Transcript] ✅ Succès: ${fullText.length} caractères`);
    
    cache.set(cacheKey, fullText, 1000 * 60 * 60 * 24);
    
    return fullText;
    
  } catch (error) {
    console.error(`[Transcript] ❌ Erreur:`, error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error("Erreur inconnue");
  }
}

/**
 * Récupère les métadonnées de la vidéo (titre, description, auteur)
 */
async function getYoutubeVideoInfo(videoId: string, fallbackAuthor: string = "Anonyme"): Promise<{ title: string; description: string; author: string }> {
  try {
    console.log(`[VideoInfo] Récupération des métadonnées pour ${videoId}`);
    
    // Simple fetch de la page YouTube pour extraire les métadonnées de base
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Extraire le titre
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : "Vidéo YouTube";
    
    // Extraire l'auteur (nom de la chaîne)
    const authorMatch = html.match(/"author":"([^"]+)"/);
    const author = authorMatch ? authorMatch[1] : fallbackAuthor;
    
    // Extraire la description (simplifiée)
    const descMatch = html.match(/"shortDescription":"([^"]+)"/);
    const description = descMatch ? descMatch[1].substring(0, 500) : "";
    
    console.log(`[VideoInfo] ✅ Titre: ${title}`);
    console.log(`[VideoInfo] ✅ Chaîne: ${author}`);
    
    return {
      title,
      description,
      author,
    };
  } catch (error) {
    console.error("[VideoInfo] ⚠️  Erreur:", error);
    // Valeurs par défaut en cas d'erreur
    return {
      title: "Vidéo YouTube",
      description: "",
      author: fallbackAuthor,
    };
  }
}

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

    // Vérifier que l'utilisateur est admin ou owner et récupérer son pseudo
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { 
        role: true,
        pseudo: true,
      },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
      return NextResponse.json(
        { error: "Accès refusé. Seuls les administrateurs peuvent utiliser cette fonctionnalité." },
        { status: 403 }
      );
    }

    const userPseudo = user.pseudo || "Anonyme";

    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId est requis" },
        { status: 400 }
      );
    }

    console.log(`[API] Traitement de la vidéo ${videoId}`);

    // Récupérer les informations et la transcription
    const [videoInfo, transcript] = await Promise.all([
      getYoutubeVideoInfo(videoId, userPseudo),
      getYoutubeTranscript(videoId),
    ]);

    return NextResponse.json({
      title: videoInfo.title,
      description: videoInfo.description,
      author: videoInfo.author,
      transcript,
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
