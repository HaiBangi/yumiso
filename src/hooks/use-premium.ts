"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

interface PremiumInfo {
  isPremium: boolean;
  premiumUntil: Date | null;
  daysRemaining: number | null;
}

interface UsePremiumReturn {
  isPremium: boolean;
  isLoading: boolean;
  premiumUntil: Date | null;
  daysRemaining: number | null;
  refresh: () => Promise<void>;
}

export function usePremium(): UsePremiumReturn {
  const { data: session, status } = useSession();
  const [premiumInfo, setPremiumInfo] = useState<PremiumInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPremiumInfo = useCallback(async () => {
    if (status === "loading") return;

    if (!session?.user?.id) {
      setPremiumInfo({ isPremium: false, premiumUntil: null, daysRemaining: null });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/premium");
      if (response.ok) {
        const data = await response.json();
        setPremiumInfo({
          ...data,
          premiumUntil: data.premiumUntil ? new Date(data.premiumUntil) : null,
        });
      } else {
        setPremiumInfo({ isPremium: false, premiumUntil: null, daysRemaining: null });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du statut premium:", error);
      setPremiumInfo({ isPremium: false, premiumUntil: null, daysRemaining: null });
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, status]);

  useEffect(() => {
    fetchPremiumInfo();
  }, [fetchPremiumInfo]);

  return {
    isPremium: premiumInfo?.isPremium ?? false,
    isLoading: status === "loading" || isLoading,
    premiumUntil: premiumInfo?.premiumUntil ?? null,
    daysRemaining: premiumInfo?.daysRemaining ?? null,
    refresh: fetchPremiumInfo,
  };
}
