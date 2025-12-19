import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache, cacheKeys } from "@/lib/cache";
import { Innertube } from "youtubei.js";
import { HttpsProxyAgent } from "https-proxy-agent";

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
 * Génère une URL de proxy avec rotation basée sur le videoId
 * Cela permet de changer l'IP pour éviter les blocages YouTube
 */
function getProxyUrl(videoId?: string, retryCount: number = 0): string | undefined {
  const proxyUrl = process.env.PROXY_URL;
  
  // Pas de proxy en développement local
  if (process.env.NODE_ENV === 'development') {
    console.log('[Proxy] Mode développement - Pas de proxy utilisé');
    return undefined;
  }

  if (!proxyUrl) {
    console.warn('[Proxy] ⚠️ PROXY_URL non configuré - Les requêtes YouTube risquent d\'être bloquées en production');
    return undefined;
  }

  // Decodo gère la rotation d'IP automatiquement, pas besoin d'ajouter de paramètres
  if (videoId) {
    console.log(`[Proxy] Utilisation du proxy Decodo pour: ${videoId} (retry: ${retryCount})`);
  } else {
    console.log('[Proxy] Utilisation du proxy Decodo');
  }
  
  return proxyUrl;
}

/**
 * Récupère ou crée un client Innertube avec support proxy Decodo
 */
async function getInnertubeClient(videoId?: string, retryCount: number = 0): Promise<Innertube> {
  const now = Date.now();
  
  // En production, on recrée le client à chaque fois pour utiliser le proxy
  const shouldRecreate = process.env.NODE_ENV === 'production' || !innertubeClient || innertubeClientExpiry < now;
  
  if (!shouldRecreate && innertubeClient) {
    console.log('[Innertube] Réutilisation du client existant');
    return innertubeClient;
  }

  console.log('[Innertube] Création d\'un nouveau client...');

  try {
    const proxyUrl = getProxyUrl(videoId, retryCount);
    
    // Créer un agent proxy si l'URL est fournie
    const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    
    const innertube = await Innertube.create({
      fetch: proxyAgent ? (async (input: RequestInfo | URL, init?: RequestInit) => {
        // Utiliser le proxy agent pour toutes les requêtes YouTube
        return await fetch(input, {
          ...init,
          // @ts-expect-error - La propriété agent est supportée par node-fetch et undici
          agent: proxyAgent,
        });
      }) as typeof fetch : undefined,
      generate_session_locally: true,
      lang: 'fr',
      location: 'FR',
    });

    // En développement, on garde le client en cache
    if (process.env.NODE_ENV === 'development') {
      innertubeClient = innertube;
      innertubeClientExpiry = now + CLIENT_TTL;
    }
    
    console.log('[Innertube] ✅ Client créé avec succès' + (proxyAgent ? ' (avec proxy Decodo)' : ''));
    return innertube;

  } catch (error) {
    console.error('[Innertube] Erreur création client:', error);
    throw error;
  }
}

/**
 * Récupère la transcription d'une vidéo YouTube en utilisant youtubei.js
 * Utilise directement l'URL timedtext fournie par l'API YouTube
 * Avec retry logic et rotation de proxy pour éviter les blocages
 */
async function getYoutubeTranscript(videoId: string, retryCount: number = 0): Promise<string> {
  const MAX_RETRIES = 3;
  
  const cacheKey = cacheKeys.youtubeTranscript(videoId);
  const cached = cache.get<string>(cacheKey);
  if (cached) {
    console.log(`[Transcript] ✅ Cache hit pour ${videoId}`);
    return cached;
  }

  console.log(`[Transcript] Récupération pour ${videoId} (tentative ${retryCount + 1}/${MAX_RETRIES + 1})`);

  try {
    const innertube = await getInnertubeClient(videoId, retryCount);
    
    // Récupérer les informations de base de la vidéo (inclut les caption tracks)
    console.log(`[Transcript] Récupération des infos vidéo...`);
    const videoInfo = await innertube.getBasicInfo(videoId);
    
    // Vérifier si YouTube demande une vérification bot
    const playabilityStatus = (videoInfo as unknown as { playability_status?: { reason?: string } }).playability_status;
    if (playabilityStatus?.reason?.includes('bot')) {
      console.warn('[Transcript] ⚠️ YouTube détecte un bot - Rotation de proxy nécessaire');
      
      if (retryCount < MAX_RETRIES) {
        console.log(`[Transcript] 🔄 Retry ${retryCount + 1}/${MAX_RETRIES} avec nouveau proxy...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Backoff exponentiel
        return getYoutubeTranscript(videoId, retryCount + 1);
      }
      
      throw new Error("YouTube bloque les requêtes même avec proxy. Veuillez configurer un proxy résidentiel dans PROXY_URL.");
    }
    
    // Vérifier si des sous-titres sont disponibles
    if (!videoInfo.captions?.caption_tracks || videoInfo.captions.caption_tracks.length === 0) {
      // Si pas de captions et qu'on peut retry, essayer avec une nouvelle rotation de proxy
      if (retryCount < MAX_RETRIES) {
        console.log(`[Transcript] ⚠️ Pas de captions trouvées - Retry ${retryCount + 1}/${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return getYoutubeTranscript(videoId, retryCount + 1);
      }
      
      throw new Error("Cette vidéo n'a pas de sous-titres disponibles. Le créateur doit activer les sous-titres.");
    }

    console.log(`[Transcript] ${videoInfo.captions.caption_tracks.length} piste(s) de sous-titres trouvée(s)`);

    // ...existing code pour sélection et parsing des captions...
    
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
    const proxyUrl = getProxyUrl(videoId, retryCount);
    
    // Créer un agent proxy pour le fetch des sous-titres
    const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    
    const subtitleResponse = await fetch(trackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': `https://www.youtube.com/watch?v=${videoId}`
      },
      // @ts-expect-error - La propriété agent est supportée par node-fetch et undici
      agent: proxyAgent,
    });

    if (!subtitleResponse.ok) {
      if (retryCount < MAX_RETRIES) {
        console.log(`[Transcript] ⚠️ Erreur HTTP ${subtitleResponse.status} - Retry...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return getYoutubeTranscript(videoId, retryCount + 1);
      }
      throw new Error(`Erreur HTTP ${subtitleResponse.status}`);
    }

    const subtitleXml = await subtitleResponse.text();
    console.log(`[Transcript] Données reçues: ${subtitleXml.length} caractères`);

    if (subtitleXml.length === 0) {
      if (retryCount < MAX_RETRIES) {
        console.log(`[Transcript] ⚠️ Réponse vide - Retry...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return getYoutubeTranscript(videoId, retryCount + 1);
      }
      throw new Error("Réponse vide du serveur YouTube");
    }

    // Parser le XML des sous-titres
    const fullText = parseXmlTranscript(subtitleXml);

    if (fullText.length === 0) {
      console.error(`[Transcript] Données brutes:`, subtitleXml.substring(0, 500));
      
      if (retryCount < MAX_RETRIES) {
        console.log(`[Transcript] ⚠️ Parsing échoué - Retry...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return getYoutubeTranscript(videoId, retryCount + 1);
      }
      
      throw new Error("Impossible d'extraire le texte des sous-titres");
    }

    console.log(`[Transcript] ✅ Succès: ${fullText.length} caractères`);
    
    // Mettre en cache pour 24h
    cache.set(cacheKey, fullText, 1000 * 60 * 60 * 24);
    
    return fullText;

  } catch (error) {
    console.error(`[Transcript] ❌ Erreur (tentative ${retryCount + 1}):`, error);
    
    // Retry automatique en cas d'erreur si on n'a pas atteint le max
    if (retryCount < MAX_RETRIES) {
      console.log(`[Transcript] 🔄 Retry automatique ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return getYoutubeTranscript(videoId, retryCount + 1);
    }
    
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
 * Récupère les métadonnées de la vidéo avec support proxy
 */
async function getYoutubeVideoInfo(videoId: string, fallbackAuthor: string = "Anonyme", retryCount: number = 0): Promise<{ title: string; description: string; author: string }> {
  const MAX_RETRIES = 3;
  
  try {
    console.log(`[VideoInfo] Récupération des métadonnées pour ${videoId}`);
    
    const innertube = await getInnertubeClient(videoId, retryCount);
    const videoInfo = await innertube.getBasicInfo(videoId);
    
    // Vérifier si YouTube bloque la requête
    const playabilityStatus = (videoInfo as unknown as { playability_status?: { reason?: string } }).playability_status;
    if (playabilityStatus?.reason?.includes('bot')) {
      if (retryCount < MAX_RETRIES) {
        console.log(`[VideoInfo] 🔄 Retry ${retryCount + 1}/${MAX_RETRIES} - Bot détecté`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return getYoutubeVideoInfo(videoId, fallbackAuthor, retryCount + 1);
      }
    }
    
    const title = videoInfo.basic_info.title || "Vidéo YouTube";
    const author = videoInfo.basic_info.author || fallbackAuthor;
    const description = videoInfo.basic_info.short_description || "";
    
    console.log(`[VideoInfo] ✅ Titre: ${title}`);
    console.log(`[VideoInfo] ✅ Chaîne: ${author}`);
    
    return { title, description, author };
    
  } catch (error) {
    console.error("[VideoInfo] ⚠️ Erreur:", error);
    
    // Retry en cas d'erreur
    if (retryCount < MAX_RETRIES) {
      console.log(`[VideoInfo] 🔄 Retry ${retryCount + 1}/${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return getYoutubeVideoInfo(videoId, fallbackAuthor, retryCount + 1);
    }
    
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