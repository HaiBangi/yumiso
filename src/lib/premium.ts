import { db } from "@/lib/db";

/**
 * Vérifie si un utilisateur a accès aux fonctionnalités premium
 * Un utilisateur est premium si:
 * - isPremium est true ET
 * - premiumUntil est null (premium à vie) OU premiumUntil > maintenant
 */
export async function checkUserPremium(userId: string): Promise<{
  isPremium: boolean;
  premiumUntil: Date | null;
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      premiumUntil: true,
      role: true,
    },
  });

  if (!user) {
    return { isPremium: false, premiumUntil: null };
  }

  // Les OWNER et ADMIN ont toujours accès aux fonctionnalités premium
  if (user.role === "OWNER" || user.role === "ADMIN") {
    return { isPremium: true, premiumUntil: null };
  }

  // Vérifier le statut premium
  if (!user.isPremium) {
    return { isPremium: false, premiumUntil: null };
  }

  // Si premiumUntil est null, c'est un premium à vie
  if (!user.premiumUntil) {
    return { isPremium: true, premiumUntil: null };
  }

  // Vérifier si le premium n'est pas expiré
  const now = new Date();
  if (user.premiumUntil > now) {
    return { isPremium: true, premiumUntil: user.premiumUntil };
  }

  // Le premium a expiré
  return { isPremium: false, premiumUntil: user.premiumUntil };
}

/**
 * Vérifie si un utilisateur est premium et lance une erreur si non
 */
export async function requirePremium(userId: string): Promise<void> {
  const { isPremium } = await checkUserPremium(userId);

  if (!isPremium) {
    throw new Error("Cette fonctionnalité nécessite un abonnement Premium");
  }
}

/**
 * Récupère les infos premium d'un utilisateur (pour le frontend)
 */
export async function getUserPremiumInfo(userId: string): Promise<{
  isPremium: boolean;
  premiumUntil: Date | null;
  daysRemaining: number | null;
}> {
  const { isPremium, premiumUntil } = await checkUserPremium(userId);

  let daysRemaining: number | null = null;
  if (isPremium && premiumUntil) {
    const now = new Date();
    const diffTime = premiumUntil.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    isPremium,
    premiumUntil,
    daysRemaining,
  };
}
