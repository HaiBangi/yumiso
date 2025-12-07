import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Innertube } from "youtubei.js";

/**
 * Récupère la transcription d'une vidéo YouTube en utilisant youtubei.js
 */
async function getYoutubeTranscript(videoId: string): Promise<string> {
  try {
    console.log(`[Transcript] Initialisation pour ${videoId}`);
    
    const youtube = await Innertube.create({
      lang: 'fr',
      location: 'FR',
      retrieve_player: false,
    });

    console.log(`[Transcript] Récupération des informations...`);
    const info = await youtube.getInfo(videoId);

    // Récupérer la transcription
    const transcriptData = await info.getTranscript();
    
    if (!transcriptData) {
      throw new Error("NO_TRANSCRIPT_AVAILABLE");
    }

    console.log(`[Transcript] Transcription trouvée`);
    
    // Extraire le texte
    const transcript = transcriptData.transcript;
    
    if (!transcript || !transcript.content || !transcript.content.body) {
      throw new Error("INVALID_TRANSCRIPT_FORMAT");
    }

    const segments = transcript.content.body.initial_segments || [];
    
    if (segments.length === 0) {
      throw new Error("EMPTY_TRANSCRIPT");
    }

    const fullText = segments
      .map((segment: any) => {
        const text = segment.snippet?.text?.toString() || "";
        return text;
      })
      .filter((text: string) => text.trim().length > 0)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (fullText.length === 0) {
      throw new Error("EMPTY_TEXT");
    }

    console.log(`[Transcript] ✅ Succès: ${fullText.length} caractères, ${segments.length} segments`);
    
    return fullText;
  } catch (error) {
    console.error("[Transcript] ❌ Erreur:", error);
    
    if (error instanceof Error) {
      const msg = error.message;
      
      if (msg === "NO_TRANSCRIPT_AVAILABLE" || msg.includes("Transcript is not available")) {
        throw new Error(
          "Cette vidéo n'a pas de sous-titres disponibles. " +
          "Le créateur doit activer les sous-titres (automatiques ou manuels)."
        );
      }
      
      if (msg === "INVALID_TRANSCRIPT_FORMAT" || msg === "EMPTY_TRANSCRIPT" || msg === "EMPTY_TEXT") {
        throw new Error(
          "Les sous-titres de cette vidéo ne peuvent pas être récupérés. " +
          "Format invalide ou transcription vide."
        );
      }

      if (msg.includes("Video unavailable") || msg.includes("private")) {
        throw new Error(
          "Cette vidéo n'est pas accessible (privée, supprimée ou région restreinte)."
        );
      }
    }
    
    throw new Error(
      `Erreur lors de la récupération de la transcription: ${error instanceof Error ? error.message : "Inconnue"}`
    );
  }
}

/**
 * Récupère les métadonnées de la vidéo (titre, description) avec youtubei.js
 */
async function getYoutubeVideoInfo(videoId: string): Promise<{ title: string; description: string }> {
  try {
    console.log(`[VideoInfo] Récupération des métadonnées pour ${videoId}`);
    
    const youtube = await Innertube.create({
      retrieve_player: false,
    });

    const info = await youtube.getInfo(videoId);
    
    const title = info.basic_info.title || "Vidéo YouTube";
    const description = info.basic_info.short_description || "";

    console.log(`[VideoInfo] ✅ Titre: ${title}`);
    
    return {
      title,
      description,
    };
  } catch (error) {
    console.error("[VideoInfo] ⚠️  Erreur:", error);
    return {
      title: "Vidéo YouTube",
      description: "",
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

    // Vérifier que l'utilisateur est admin ou owner
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
      return NextResponse.json(
        { error: "Accès refusé. Seuls les administrateurs peuvent utiliser cette fonctionnalité." },
        { status: 403 }
      );
    }

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
      getYoutubeVideoInfo(videoId),
      getYoutubeTranscript(videoId),
    ]);

    return NextResponse.json({
      title: videoInfo.title,
      description: videoInfo.description,
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
