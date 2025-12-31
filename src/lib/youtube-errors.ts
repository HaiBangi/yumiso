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
      message.includes('pas de sous-titres') ||
      message.includes('no subtitles') ||
      message.includes('subtitles unavailable') ||
      message.includes('captions unavailable')
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
