/**
 * Script de test pour vérifier si une vidéo YouTube a une transcription disponible
 * 
 * Usage:
 *   node scripts/test-youtube-transcript.js VIDEO_ID
 * 
 * Exemple:
 *   node scripts/test-youtube-transcript.js 7YvynzSsarU
 */

const { Innertube } = require('youtubei.js');

async function testTranscript(videoId) {
  console.log(`\n🔍 Test de la vidéo: ${videoId}`);
  console.log(`📺 URL: https://www.youtube.com/watch?v=${videoId}\n`);

  try {
    console.log('⏳ Initialisation de Innertube...');
    const youtube = await Innertube.create({
      lang: 'fr',
      location: 'FR',
      retrieve_player: false,
    });

    console.log('⏳ Récupération des informations de la vidéo...');
    const info = await youtube.getInfo(videoId);
    
    console.log(`✅ Titre: ${info.basic_info.title}`);
    console.log(`📝 Durée: ${Math.floor(info.basic_info.duration / 60)}min ${info.basic_info.duration % 60}s`);
    console.log(`👁️  Vues: ${info.basic_info.view_count?.toLocaleString() || 'N/A'}`);

    console.log('\n⏳ Récupération de la transcription...');
    const transcriptData = await info.getTranscript();
    
    if (!transcriptData) {
      console.log('❌ Aucune transcription disponible');
      return;
    }

    const transcript = transcriptData.transcript;
    const segments = transcript?.content?.body?.initial_segments || [];
    
    if (segments.length === 0) {
      console.log('❌ Transcription vide');
      return;
    }

    const fullText = segments
      .map(segment => segment.snippet?.text?.toString() || '')
      .filter(text => text.trim().length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`\n✅ Transcription récupérée avec succès!`);
    console.log(`📊 Segments: ${segments.length}`);
    console.log(`📏 Longueur: ${fullText.length} caractères`);
    console.log(`\n📄 Aperçu (premiers 500 caractères):`);
    console.log('─'.repeat(80));
    console.log(fullText.substring(0, 500) + '...');
    console.log('─'.repeat(80));
    
    console.log(`\n✨ Cette vidéo peut être utilisée avec YouTube to Recipe!`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('\nDétails:', error);
  }
}

// Récupérer l'ID de la vidéo depuis les arguments
const videoId = process.argv[2];

if (!videoId) {
  console.log(`
Usage: node scripts/test-youtube-transcript.js VIDEO_ID

Exemples:
  node scripts/test-youtube-transcript.js 7YvynzSsarU
  node scripts/test-youtube-transcript.js dQw4w9WgXcQ

Ou avec une URL complète:
  node scripts/test-youtube-transcript.js "https://www.youtube.com/watch?v=7YvynzSsarU"
  `);
  process.exit(1);
}

// Extraire l'ID si c'est une URL
let cleanVideoId = videoId;
if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
  const match = videoId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (match) {
    cleanVideoId = match[1];
  }
}

testTranscript(cleanVideoId);
