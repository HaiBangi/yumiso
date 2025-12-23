import { NextResponse } from "next/server";

/**
 * Endpoint pour déclencher le téléchargement d'une image Unsplash
 * Conforme aux guidelines Unsplash API #2
 * 
 * Doit être appelé quand l'utilisateur "utilise" une image (ex: sélectionne la recette)
 */
export async function POST(request: Request) {
  try {
    const { downloadLocation } = await request.json();

    if (!downloadLocation) {
      return NextResponse.json(
        { error: "downloadLocation manquant" },
        { status: 400 }
      );
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!accessKey) {
      console.warn("⚠️ UNSPLASH_ACCESS_KEY manquante - impossible de déclencher le download");
      return NextResponse.json({ success: false, message: "No API key" });
    }

    // Envoyer la requête au download endpoint d'Unsplash
    // Cela permet de tracker les "downloads" et est requis par les guidelines
    const response = await fetch(downloadLocation, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Download Unsplash tracké: ${data.url}`);
      return NextResponse.json({ success: true, data });
    }

    console.error(`❌ Erreur lors du tracking du download: ${response.status}`);
    return NextResponse.json(
      { success: false, error: "Failed to track download" },
      { status: response.status }
    );
  } catch (error) {
    console.error("❌ Erreur lors du tracking du download Unsplash:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
