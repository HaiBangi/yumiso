import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache, cacheKeys } from "@/lib/cache";
import { Innertube } from "youtubei.js";

// Types pour les caption tracks
interface CaptionTrack {
  baseUrl?: string;
  base_url?: string;
  languageCode?: string;
  language_code?: string;
  name?: { simpleText?: string; text?: string };
  kind?: string;
}

// Singleton pour Innertube client
let innertubeClient: Innertube | null = null;
let innertubeClientExpiry: number = 0;
const CLIENT_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Récupère ou crée un client Innertube
 */
async function getInnertubeClient(): Promise<Innertube> {
  const now = Date.now();
  
  // Réutiliser le client existant s'il est encore valide
  if (innertubeClient && innertubeClientExpiry > now) {
    console.log('[Innertube] Réutilisation du client existant');
    return innertubeClient;
  }

  console.log('[Innertube] Création d\'un nouveau client...');

  try {
    const innertube = await Innertube.create({
      generate_session_locally: true,
      lang: 'fr',
      location: 'FR',
    });

    innertubeClient = innertube;
    innertubeClientExpiry = now + CLIENT_TTL;
    console.log('[Innertube] ✅ Client créé avec succès');
    return innertube;

  } catch (error) {
    console.error('[Innertube] Erreur création client:', error);
    throw error;
  }
}

/**
 * Récupère la transcription d'une vidéo YouTube en utilisant youtubei.js
 * Utilise directement l'URL timedtext fournie par l'API YouTube
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
    const innertube = await getInnertubeClient();
    
    // Récupérer les informations de base de la vidéo (inclut les caption tracks)
    console.log(`[Transcript] Récupération des infos vidéo...`);
    const videoInfo = await innertube.getBasicInfo(videoId);
    
    // Vérifier si des sous-titres sont disponibles
    if (!videoInfo.captions?.caption_tracks || videoInfo.captions.caption_tracks.length === 0) {
      throw new Error("Cette vidéo n'a pas de sous-titres disponibles. Le créateur doit activer les sous-titres.");
    }

    console.log(`[Transcript] ${videoInfo.captions.caption_tracks.length} piste(s) de sous-titres trouvée(s)`);

    // Sélectionner la meilleure piste (FR > EN > première)
    const captionTracks = videoInfo.captions.caption_tracks;
    let selectedTrack = captionTracks.find((t: CaptionTrack) => {
      const langCode = t.language_code || t.languageCode;
      return langCode === 'fr' || langCode?.startsWith('fr');
    });
    
    if (!selectedTrack) {
      selectedTrack = captionTracks.find((t: CaptionTrack) => {
        const langCode = t.language_code || t.languageCode;
        return langCode === 'en' || langCode?.startsWith('en');
      });
    }
    
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    const trackUrl = selectedTrack?.base_url || (selectedTrack as CaptionTrack)?.baseUrl;
    const trackLang = selectedTrack?.language_code || (selectedTrack as CaptionTrack)?.languageCode;
    
    console.log(`[Transcript] Langue sélectionnée: ${trackLang}`);

    if (!trackUrl) {
      throw new Error("URL de sous-titres non disponible");
    }

    // Récupérer les sous-titres directement via l'URL timedtext
    console.log(`[Transcript] Récupération des sous-titres...`);
    const subtitleResponse = await fetch(trackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': `https://www.youtube.com/watch?v=${videoId}`
      }
    });

    if (!subtitleResponse.ok) {
      throw new Error(`Erreur HTTP ${subtitleResponse.status}`);
    }

    const subtitleXml = await subtitleResponse.text();
    console.log(`[Transcript] Données reçues: ${subtitleXml.length} caractères`);

    if (subtitleXml.length === 0) {
      throw new Error("Réponse vide du serveur YouTube");
    }

    // Parser le XML des sous-titres
    const fullText = parseXmlTranscript(subtitleXml);

    if (fullText.length === 0) {
      console.error(`[Transcript] Données brutes:`, subtitleXml.substring(0, 500));
      throw new Error("Impossible d'extraire le texte des sous-titres");
    }

    console.log(`[Transcript] ✅ Succès: ${fullText.length} caractères`);
    
    // Mettre en cache pour 24h
    cache.set(cacheKey, fullText, 1000 * 60 * 60 * 24);
    
    return fullText;

  } catch (error) {
    console.error(`[Transcript] ❌ Erreur:`, error);
    throw error;
  }
}

/**
 * Parse le XML de transcription YouTube
 * Supporte les formats <text> (standard) et <p> (Android)
 */
function parseXmlTranscript(subtitleData: string): string {
  // Format <text start="sec" dur="sec">text</text> (standard)
  const textMatches = Array.from(subtitleData.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g));
  
  if (textMatches.length > 0) {
    console.log(`[Transcript] Format XML standard: ${textMatches.length} segments`);
    return textMatches
      .map(match => {
        const rawText = match[1];
        if (!rawText) return '';
        return decodeHtmlEntities(rawText.replace(/<[^>]+>/g, '')).trim();
      })
      .filter(text => text.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Format <p t="ms" d="ms">text</p> (Android)
  const pTagMatches = Array.from(subtitleData.matchAll(/<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g));
  
  if (pTagMatches.length > 0) {
    console.log(`[Transcript] Format XML Android: ${pTagMatches.length} segments`);
    return pTagMatches
      .map(match => {
        const rawText = match[3];
        if (!rawText) return '';
        return decodeHtmlEntities(rawText.replace(/<[^>]+>/g, '')).trim();
      })
      .filter(text => text.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return '';
}

/**
 * Décode les entités HTML
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

/**
 * Récupère les métadonnées de la vidéo
 */
async function getYoutubeVideoInfo(videoId: string, fallbackAuthor: string = "Anonyme"): Promise<{ title: string; description: string; author: string }> {
  try {
    console.log(`[VideoInfo] Récupération des métadonnées pour ${videoId}`);
    
    const innertube = await getInnertubeClient();
    const videoInfo = await innertube.getBasicInfo(videoId);
    
    const title = videoInfo.basic_info.title || "Vidéo YouTube";
    const author = videoInfo.basic_info.author || fallbackAuthor;
    const description = videoInfo.basic_info.short_description || "";
    
    console.log(`[VideoInfo] ✅ Titre: ${title}`);
    console.log(`[VideoInfo] ✅ Chaîne: ${author}`);
    
    return { title, description, author };
    
  } catch (error) {
    console.error("[VideoInfo] ⚠️ Erreur:", error);
    return { title: "Vidéo YouTube", description: "", author: fallbackAuthor };
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

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, pseudo: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
      return NextResponse.json(
        { error: "Accès refusé. Seuls les administrateurs peuvent utiliser cette fonctionnalité." },
        { status: 403 }
      );
    }

    const userPseudo = user.pseudo || "Anonyme";
    const { videoId, metadataOnly } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId est requis" },
        { status: 400 }
      );
    }

    console.log(`[API] Traitement de la vidéo ${videoId}${metadataOnly ? ' (metadata only)' : ''}`);

    // Si on ne veut que les métadonnées, on retourne juste le titre
    if (metadataOnly) {
      const videoInfo = await getYoutubeVideoInfo(videoId, userPseudo);
      return NextResponse.json({
        title: videoInfo.title,
        description: videoInfo.description,
        author: videoInfo.author,
      });
    }

    // Sinon, on récupère tout (métadonnées + transcription)
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