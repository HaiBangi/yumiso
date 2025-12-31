import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache, cacheKeys } from "@/lib/cache";
import { Innertube } from "youtubei.js";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { NoRetryError } from "@/lib/youtube-errors";

// Configuration du runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// PROXY CONFIGURATION (Floxy residential IPs)
// ============================================================================

let proxyAgent: ProxyAgent | null = null;
let proxyFailed = false;
let proxyConfigured = false;

/**
 * Parse l'URL du proxy pour différents formats
 * Supporte: host:port:username:password (Floxy) ou user:pass@host:port
 */
function parseProxyUrl(proxyUrl: string): string {
  // Si déjà avec protocole, retourner tel quel
  if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
    return proxyUrl;
  }

  // Si format user:pass@host:port, ajouter http://
  if (proxyUrl.includes('@')) {
    return `http://${proxyUrl}`;
  }

  // Parser le format Floxy: host:port:username:password
  const parts = proxyUrl.split(':');
  if (parts.length === 4) {
    const [host, port, username, password] = parts;
    return `http://${username}:${password}@${host}:${port}`;
  }

  // Fallback
  return proxyUrl;
}

/**
 * Crée une fonction fetch avec proxy Floxy pour les requêtes YouTube
 * Basé sur l'implémentation de seomikewaltman qui fonctionne en production
 */
function getProxyFetch(): typeof fetch | undefined {
  // En mode test, pas de proxy
  if (process.env.NODE_ENV === 'test') {
    return undefined;
  }

  const proxyUrl = process.env.PROXY_URL;

  if (!proxyUrl || proxyFailed) {
    if (!proxyConfigured) {
      proxyConfigured = true;
      if (process.env.NODE_ENV === 'production') {
        console.warn('[Proxy] ⚠️ PROXY_URL non configuré - YouTube risque de bloquer les requêtes en production');
      }
    }
    return undefined;
  }

  if (!proxyAgent) {
    try {
      const parsedUrl = parseProxyUrl(proxyUrl);
      console.log('[Proxy] ✅ Configuration du proxy résidentiel Floxy');
      proxyAgent = new ProxyAgent(parsedUrl);
      proxyConfigured = true;
    } catch (error) {
      console.error('[Proxy] ❌ Erreur configuration proxy:', error);
      proxyFailed = true;
      proxyConfigured = true;
      return undefined;
    }
  }

  // Retourner la fonction fetch avec le proxy undici
  // Cast via unknown pour éviter les erreurs de type entre undici Response et global Response
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    // Gérer les objets Request - extraire l'URL et fusionner les options
    if (input instanceof Request) {
      const url = input.url;
      return undiciFetch(url, {
        method: input.method,
        headers: input.headers as HeadersInit,
        body: input.body,
        ...init,
        dispatcher: proxyAgent!,
      } as Parameters<typeof undiciFetch>[1]);
    }

    const url = typeof input === 'string' ? input : input.toString();
    return undiciFetch(url, {
      ...init,
      dispatcher: proxyAgent!,
    } as Parameters<typeof undiciFetch>[1]);
  }) as unknown as typeof fetch;
}

// ============================================================================
// TRANSCRIPT PARSING
// ============================================================================

interface TranscriptSegment {
  durationMs: number;
  startMs: number;
  text: string;
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
 * Parse le format <p t="ms" d="ms">text</p> (Android client)
 */
function parsePTagFormat(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const pTagRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;

  let match = pTagRegex.exec(xml);
  while (match !== null) {
    const [, startMsStr, durationMsStr, rawText] = match;
    if (startMsStr && durationMsStr && rawText) {
      const text = decodeHtmlEntities(rawText.replace(/<[^>]+>/g, '')).trim();
      if (text) {
        segments.push({
          durationMs: parseInt(durationMsStr, 10),
          startMs: parseInt(startMsStr, 10),
          text,
        });
      }
    }
    match = pTagRegex.exec(xml);
  }
  return segments;
}

/**
 * Parse le format <text start="sec" dur="sec">text</text> (format standard)
 */
function parseTextTagFormat(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const textTagRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;

  let match = textTagRegex.exec(xml);
  while (match !== null) {
    const [, startStr, durStr, rawText] = match;
    if (startStr && durStr && rawText) {
      const text = decodeHtmlEntities(rawText.replace(/<[^>]+>/g, '')).trim();
      if (text) {
        segments.push({
          durationMs: Math.round(parseFloat(durStr) * 1000),
          startMs: Math.round(parseFloat(startStr) * 1000),
          text,
        });
      }
    }
    match = textTagRegex.exec(xml);
  }
  return segments;
}

/**
 * Parse le XML de transcription YouTube
 * Supporte les formats <text> (standard) et <p> (Android)
 */
function parseTimedTextXml(xml: string): TranscriptSegment[] {
  // Essayer d'abord le format <p> (Android client)
  const pSegments = parsePTagFormat(xml);
  if (pSegments.length > 0) {
    return pSegments;
  }
  // Fallback au format <text>
  return parseTextTagFormat(xml);
}

// ============================================================================
// YOUTUBE CLIENT & TRANSCRIPT FETCHING
// ============================================================================

// Types pour les caption tracks
interface CaptionTrack {
  baseUrl?: string;
  base_url?: string;
  languageCode?: string;
  language_code?: string;
  name?: { simpleText?: string; text?: string };
  kind?: string;
}

/**
 * Initialise le client YouTube avec proxy Floxy
 */
async function initializeYouTube(): Promise<[Innertube | null, Error | null]> {
  const clientId = Math.random().toString(36).substring(7);
  try {
    console.log(`[YouTube] [${clientId}] Initialisation du client...`);

    const proxyFetch = getProxyFetch();
    const usingProxy = proxyFetch ? '(avec proxy Floxy)' : '(sans proxy)';

    const client = await Innertube.create({
      generate_session_locally: true,
      lang: 'fr',
      location: 'FR',
      retrieve_player: false,
      fetch: proxyFetch,
    });

    console.log(`[YouTube] [${clientId}] ✅ Client créé ${usingProxy}`);
    return [client, null];
  } catch (error) {
    console.error(`[YouTube] [${clientId}] ❌ Erreur création client:`, error);
    return [null, error as Error];
  }
}

/**
 * Récupère le XML des sous-titres depuis l'URL timedtext
 */
async function fetchTimedTextXml(captionUrl: string, videoId: string): Promise<string> {
  const proxyFetch = getProxyFetch() || fetch;

  console.log(`[Transcript] Récupération des sous-titres via timedtext...`);

  const response = await proxyFetch(captionUrl, {
    headers: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status} pour la vidéo ${videoId}`);
  }

  const xml = await response.text();
  if (!xml || xml.length === 0) {
    throw new Error(`Réponse vide pour la vidéo ${videoId}`);
  }

  return xml;
}

/**
 * Récupère la transcription d'une vidéo YouTube
 */
async function fetchTranscriptForVideo(youtube: Innertube, videoId: string): Promise<{ transcript?: string; error?: string }> {
  console.log(`[Transcript] Récupération pour ${videoId}`);

  const info = await youtube.getBasicInfo(videoId);
  const captionTracks = info.captions?.caption_tracks;

  if (!captionTracks || captionTracks.length === 0) {
    console.warn(`[Transcript] ⚠️ Pas de sous-titres pour ${videoId}`);
    return { error: 'Cette vidéo n\'a pas de sous-titres disponibles' };
  }

  console.log(`[Transcript] ${captionTracks.length} piste(s) trouvée(s)`);
  console.log(`[Transcript] Langues: ${captionTracks.map((t: CaptionTrack) => t.language_code || t.languageCode).join(', ')}`);

  // Sélectionner la meilleure piste (FR > EN > première)
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
    return { error: 'URL de sous-titres non disponible' };
  }

  // Récupérer et parser le XML
  const xml = await fetchTimedTextXml(trackUrl, videoId);
  const segments = parseTimedTextXml(xml);

  if (segments.length === 0) {
    console.error(`[Transcript] ❌ Parsing échoué. Données brutes:`, xml.substring(0, 300));
    throw new Error(`Impossible de parser les sous-titres pour ${videoId}`);
  }

  // Convertir en texte brut
  const plainText = segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();

  console.log(`[Transcript] ✅ Succès: ${plainText.length} caractères (${segments.length} segments)`);

  return { transcript: plainText };
}

/**
 * Récupère les métadonnées de la vidéo
 */
async function getYoutubeVideoInfo(youtube: Innertube, videoId: string, fallbackAuthor: string = "Anonyme"): Promise<{ title: string; description: string; author: string }> {
  try {
    console.log(`[VideoInfo] Récupération des métadonnées pour ${videoId}`);

    const videoInfo = await youtube.getBasicInfo(videoId);

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

/**
 * Récupère la transcription avec cache et retry
 */
async function getYoutubeTranscript(videoId: string, retryCount: number = 0): Promise<string> {
  const MAX_RETRIES = 3;

  // Vérifier le cache
  const cacheKey = cacheKeys.youtubeTranscript(videoId);
  const cached = cache.get<string>(cacheKey);
  if (cached) {
    console.log(`[Transcript] ✅ Cache hit pour ${videoId}`);
    return cached;
  }

  try {
    // Créer le client YouTube
    const [youtube, clientError] = await initializeYouTube();
    if (clientError || !youtube) {
      throw clientError || new Error('Impossible de créer le client YouTube');
    }

    // Récupérer la transcription
    const result = await fetchTranscriptForVideo(youtube, videoId);

    if (result.error) {
      // Transformer en NoRetryError si c'est une erreur de sous-titres non disponibles
      if (result.error.includes('pas de sous-titres') || result.error.includes('no subtitles')) {
        throw new NoRetryError(result.error);
      }
      throw new Error(result.error);
    }

    if (!result.transcript) {
      throw new Error('Transcription vide');
    }

    // Mettre en cache pour 24h
    cache.set(cacheKey, result.transcript, 1000 * 60 * 60 * 24);

    return result.transcript;

  } catch (error) {
    console.error(`[Transcript] ❌ Erreur (tentative ${retryCount + 1}):`, error);

    // Ne pas faire de retry si c'est une erreur non-retriable (pas de sous-titres, etc.)
    if (error instanceof NoRetryError) {
      console.log(`[Transcript] ⚠️ Erreur non-retriable, abandon immédiat`);
      throw error;
    }

    // Retry automatique avec backoff exponentiel pour les autres erreurs
    if (retryCount < MAX_RETRIES) {
      console.log(`[Transcript] 🔄 Retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return getYoutubeTranscript(videoId, retryCount + 1);
    }

    throw error;
  }
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

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

    // Créer le client YouTube
    const [youtube, clientError] = await initializeYouTube();
    if (clientError || !youtube) {
      return NextResponse.json(
        { error: "Impossible d'initialiser le client YouTube" },
        { status: 500 }
      );
    }

    // Si on ne veut que les métadonnées
    if (metadataOnly) {
      const videoInfo = await getYoutubeVideoInfo(youtube, videoId, userPseudo);
      return NextResponse.json({
        title: videoInfo.title,
        description: videoInfo.description,
        author: videoInfo.author,
      });
    }

    // Récupérer tout (métadonnées + transcription)
    const [videoInfo, transcript] = await Promise.all([
      getYoutubeVideoInfo(youtube, videoId, userPseudo),
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

    // Pour les erreurs non-retriables (pas de sous-titres), retourner 400 au lieu de 500
    if (error instanceof NoRetryError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 } // Bad Request pour erreurs non-retriables
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Une erreur est survenue" },
      { status: 500 }
    );
  }
}
