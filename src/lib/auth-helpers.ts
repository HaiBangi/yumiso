import { auth } from "./auth";
import { Role } from "@prisma/client";

/**
 * Get current session with user
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

/**
 * Check if user has admin role or owner role
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === Role.ADMIN || user?.role === Role.OWNER;
}

/**
 * Check if user has owner role
 */
export async function isOwner() {
  const user = await getCurrentUser();
  return user?.role === Role.OWNER;
}

/**
 * Check if user can create recipes (OWNER, ADMIN or CONTRIBUTOR)
 */
export async function canCreateRecipe() {
  const user = await getCurrentUser();
  return user?.role === Role.OWNER || user?.role === Role.ADMIN || user?.role === Role.CONTRIBUTOR;
}

/**
 * Check if user can edit a specific recipe
 * - Owners and Admins can edit all recipes
 * - Contributors can only edit their own recipes
 */
export async function canEditRecipe(recipeUserId: string | null) {
  const user = await getCurrentUser();
  if (!user) return false;
  
  if (user.role === Role.OWNER || user.role === Role.ADMIN) return true;
  if (user.role === Role.CONTRIBUTOR && recipeUserId === user.id) return true;
  
  return false;
}

/**
 * Check if user can delete a specific recipe
 * Same rules as editing
 */
export async function canDeleteRecipe(recipeUserId: string | null) {
  return canEditRecipe(recipeUserId);
}

/**
 * Get role display info
 */
export function getRoleInfo(role: Role) {
  const roles = {
    OWNER: {
      label: "Owner",
      description: "Super administrateur avec tous les droits",
      color: "purple",
    },
    ADMIN: {
      label: "Administrateur",
      description: "Accès complet à toutes les fonctionnalités",
      color: "red",
    },
    CONTRIBUTOR: {
      label: "Contributeur",
      description: "Peut créer et modifier ses propres recettes",
      color: "amber",
    },
    READER: {
      label: "Lecteur",
      description: "Peut voir les recettes et ajouter aux favoris",
      color: "blue",
    },
  };
  
  return roles[role] || roles.READER;
}

