"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { useSession } from "next-auth/react";

interface PremiumInfo {
  isPremium: boolean;
  premiumUntil: Date | null;
  daysRemaining: number | null;
}

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  premiumUntil: Date | null;
  daysRemaining: number | null;
  refresh: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [premiumInfo, setPremiumInfo] = useState<PremiumInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  const fetchPremiumInfo = useCallback(async () => {
    if (status === "loading") return;

    if (!session?.user?.id) {
      setPremiumInfo({ isPremium: false, premiumUntil: null, daysRemaining: null });
      setIsLoading(false);
      return;
    }

    // Éviter les appels multiples pour le même utilisateur
    if (hasFetchedRef.current && userIdRef.current === session.user.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PremiumProvider] Cache hit - pas d\'appel API');
      }
      return;
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PremiumProvider] Appel API /api/user/premium');
      }
      const response = await fetch("/api/user/premium");
      if (response.ok) {
        const data = await response.json();
        setPremiumInfo({
          ...data,
          premiumUntil: data.premiumUntil ? new Date(data.premiumUntil) : null,
        });
        hasFetchedRef.current = true;
        userIdRef.current = session.user.id;
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

  // Fetch only once when user ID changes
  useEffect(() => {
    fetchPremiumInfo();
  }, [fetchPremiumInfo]);

  const value: PremiumContextType = {
    isPremium: premiumInfo?.isPremium ?? false,
    isLoading: status === "loading" || isLoading,
    premiumUntil: premiumInfo?.premiumUntil ?? null,
    daysRemaining: premiumInfo?.daysRemaining ?? null,
    refresh: fetchPremiumInfo,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextType {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
}
