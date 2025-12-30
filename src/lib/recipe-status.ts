/**
 * Recipe Status Constants
 * Centralized constants for recipe visibility status
 * Use these instead of string literals for type safety
 */

// Status values as constants
export const RecipeStatus = {
  DRAFT: "DRAFT",
  PRIVATE: "PRIVATE", 
  PUBLIC: "PUBLIC",
} as const;

// Type derived from the constants
export type RecipeStatusType = (typeof RecipeStatus)[keyof typeof RecipeStatus];

// Status options for UI (forms, filters, etc.)
export const statusOptions = [
  { 
    value: RecipeStatus.DRAFT, 
    label: "Brouillon", 
    emoji: "📝", 
    description: "Visible uniquement par vous" 
  },
  { 
    value: RecipeStatus.PRIVATE, 
    label: "Privé", 
    emoji: "🔒", 
    description: "Visible uniquement par vous" 
  },
  { 
    value: RecipeStatus.PUBLIC, 
    label: "Public", 
    emoji: "🌍", 
    description: "Visible par tous" 
  },
] as const;

// Helper function to check if a status is visible only to author
export function isPrivateStatus(status: RecipeStatusType | string | undefined | null): boolean {
  return status === RecipeStatus.DRAFT || status === RecipeStatus.PRIVATE;
}

// Helper function to check if a status is public
export function isPublicStatus(status: RecipeStatusType | string | undefined | null): boolean {
  return status === RecipeStatus.PUBLIC || !status; // Default to public if undefined
}
