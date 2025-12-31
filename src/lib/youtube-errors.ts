/**
 * Erreurs spécifiques YouTube pour gérer les cas non-retriables
 */

/**
 * Erreur pour les cas où un retry ne sert à rien
 * (ex: vidéo sans sous-titres, vidéo privée, etc.)
 */
export class NoRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoRetryError';
  }
}

/**
 * Vérifie si une erreur est non-retriable basée sur le message
 */
export function isNoRetryError(error: unknown): boolean {
  if (error instanceof NoRetryError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      // Pas de sous-titres
      message.includes('pas de sous-titres') ||
      message.includes('no subtitles') ||
      message.includes('subtitles unavailable') ||
      message.includes('captions unavailable') ||
      // Vidéo indisponible / n'existe pas
      message.includes('unavailable') ||
      message.includes('indisponible') ||
      message.includes('video not found') ||
      message.includes('vidéo introuvable') ||
      message.includes('does not exist') ||
      message.includes('n\'existe pas') ||
      // Vidéo privée ou supprimée
      message.includes('private video') ||
      message.includes('vidéo privée') ||
      message.includes('video is private') ||
      message.includes('been removed') ||
      message.includes('supprimée') ||
      // URL invalide
      message.includes('invalid') ||
      message.includes('invalide')
    );
  }

  return false;
}

/**
 * Vérifie si un code de statut HTTP indique une erreur non-retriable
 * 400 = Bad Request (problème avec la requête, pas la peine de retry)
 * 404 = Not Found (vidéo n'existe pas)
 * 403 = Forbidden (vidéo privée)
 */
export function isNoRetryStatusCode(statusCode: number): boolean {
  return statusCode === 400 || statusCode === 403 || statusCode === 404;
}
