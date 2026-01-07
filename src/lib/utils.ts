import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalise une chaîne en supprimant les accents et en remplaçant les ligatures
 * Utile pour la recherche sans tenir compte des accents
 * Ex: "dîner" -> "diner", "café" -> "cafe", "bœuf" -> "boeuf", "œuf" -> "oeuf"
 */
export function normalizeString(str: string): string {
  // Étape 1: Remplacer les ligatures et caractères spéciaux
  const ligatureMap: Record<string, string> = {
    'œ': 'oe',
    'Œ': 'oe',
    'æ': 'ae',
    'Æ': 'ae',
    'ß': 'ss',
    'ø': 'o',
    'Ø': 'o',
    'å': 'a',
    'Å': 'a',
  };

  let processed = str;
  Object.entries(ligatureMap).forEach(([char, replacement]) => {
    processed = processed.replace(new RegExp(char, 'g'), replacement);
  });

  // Étape 2: Normalisation NFD pour décomposer les accents
  return processed
    .normalize("NFD") // Décompose les caractères accentués (é → e + accent)
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents décomposés
    .toLowerCase()
    .trim();
}

/**
 * Formate un temps en minutes vers un format lisible
 * - < 60 min: affiche "X min"
 * - >= 60 min: affiche "Xh" ou "XhYY" (ex: "1h", "1h30", "2h15")
 * @param minutes Nombre de minutes
 * @returns Chaîne formatée
 */
export function formatTime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes <= 0) {
    return "0 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  // Formater les minutes sur 2 chiffres si nécessaire
  const formattedMinutes = remainingMinutes < 10 ? `0${remainingMinutes}` : remainingMinutes;
  return `${hours}h${formattedMinutes}`;
}
