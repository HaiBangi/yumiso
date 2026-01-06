import { db } from "@/lib/db";
import { headers } from "next/headers";

// Types d'actions loggées
export const ActivityAction = {
  USER_SIGNUP: "USER_SIGNUP",
  USER_LOGIN: "USER_LOGIN",
  RECIPE_CREATE: "RECIPE_CREATE",
  RECIPE_UPDATE: "RECIPE_UPDATE",
  RECIPE_DELETE: "RECIPE_DELETE",
  RECIPE_GENERATE: "RECIPE_GENERATE",
  COLLECTION_CREATE: "COLLECTION_CREATE",
  COLLECTION_UPDATE: "COLLECTION_UPDATE",
  COLLECTION_DELETE: "COLLECTION_DELETE",
  COMMENT_CREATE: "COMMENT_CREATE",
  MEAL_PLAN_CREATE: "MEAL_PLAN_CREATE",
  MEAL_PLAN_OPTIMIZE: "MEAL_PLAN_OPTIMIZE",
  SHOPPING_LIST_CREATE: "SHOPPING_LIST_CREATE",
  SHOPPING_LIST_OPTIMIZE: "SHOPPING_LIST_OPTIMIZE",
} as const;

export type ActivityActionType = (typeof ActivityAction)[keyof typeof ActivityAction];

// Types d'entités
export const EntityType = {
  RECIPE: "Recipe",
  COLLECTION: "Collection",
  COMMENT: "Comment",
  MEAL_PLAN: "MealPlan",
  SHOPPING_LIST: "ShoppingList",
} as const;

export type EntityTypeType = (typeof EntityType)[keyof typeof EntityType];

interface LogActivityParams {
  userId: string;
  action: ActivityActionType;
  entityType?: EntityTypeType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

/**
 * Logger une activité utilisateur
 */
export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  entityName,
  details,
}: LogActivityParams): Promise<void> {
  try {
    // Essayer de récupérer les headers (disponible uniquement dans un contexte de requête)
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    try {
      const headersList = await headers();
      ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
      userAgent = headersList.get("user-agent") || null;
    } catch (headersError) {
      // headers() n'est pas disponible (normal dans certains contextes comme les callbacks NextAuth)
      // On continue sans ces informations
    }

    // Créer le log d'activité
    await db.userActivityLog.create({
      data: {
        userId,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        entityName: entityName || null,
        details: details ? (details as any) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Ne pas faire échouer l'action principale si le logging échoue
    console.error("Erreur lors du logging de l'activité:", error);
  }
}

/**
 * Récupérer les logs d'activité avec pagination
 */
export async function getActivityLogs({
  page = 1,
  perPage = 50,
  userId,
  action,
}: {
  page?: number;
  perPage?: number;
  userId?: string;
  action?: ActivityActionType;
} = {}) {
  const skip = (page - 1) * perPage;

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    db.userActivityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pseudo: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: perPage,
    }),
    db.userActivityLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

/**
 * Labels en français pour les actions
 */
export const ACTION_LABELS: Record<ActivityActionType, string> = {
  USER_SIGNUP: "Inscription",
  USER_LOGIN: "Connexion",
  RECIPE_CREATE: "Création de recette",
  RECIPE_UPDATE: "Modification de recette",
  RECIPE_DELETE: "Suppression de recette",
  RECIPE_GENERATE: "Génération de recette par IA",
  COLLECTION_CREATE: "Création de collection",
  COLLECTION_UPDATE: "Modification de collection",
  COLLECTION_DELETE: "Suppression de collection",
  COMMENT_CREATE: "Ajout de commentaire",
  MEAL_PLAN_CREATE: "Création de menu",
  MEAL_PLAN_OPTIMIZE: "Optimisation de menu",
  SHOPPING_LIST_CREATE: "Création de liste de courses",
  SHOPPING_LIST_OPTIMIZE: "Optimisation de liste de courses",
};

/**
 * Couleurs pour les actions (pour l'UI)
 */
export const ACTION_COLORS: Record<ActivityActionType, string> = {
  USER_SIGNUP: "text-green-600 dark:text-green-400",
  USER_LOGIN: "text-blue-600 dark:text-blue-400",
  RECIPE_CREATE: "text-amber-600 dark:text-amber-400",
  RECIPE_UPDATE: "text-orange-600 dark:text-orange-400",
  RECIPE_DELETE: "text-red-600 dark:text-red-400",
  RECIPE_GENERATE: "text-purple-600 dark:text-purple-400",
  COLLECTION_CREATE: "text-emerald-600 dark:text-emerald-400",
  COLLECTION_UPDATE: "text-teal-600 dark:text-teal-400",
  COLLECTION_DELETE: "text-red-600 dark:text-red-400",
  COMMENT_CREATE: "text-cyan-600 dark:text-cyan-400",
  MEAL_PLAN_CREATE: "text-indigo-600 dark:text-indigo-400",
  MEAL_PLAN_OPTIMIZE: "text-violet-600 dark:text-violet-400",
  SHOPPING_LIST_CREATE: "text-lime-600 dark:text-lime-400",
  SHOPPING_LIST_OPTIMIZE: "text-fuchsia-600 dark:text-fuchsia-400",
};
