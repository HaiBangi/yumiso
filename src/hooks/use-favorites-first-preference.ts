"use client";

import { useCallback } from "react";

const FAVORITES_FIRST_COOKIE_NAME = "user-favorites-first-preference";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

export function useFavoritesFirstPreference() {
  // Récupérer la préférence depuis les cookies
  const getFavoritesFirstPreference = useCallback((): boolean => {
    if (typeof document === "undefined") return true; // Par défaut activé

    const cookies = document.cookie.split(";");
    const prefCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${FAVORITES_FIRST_COOKIE_NAME}=`)
    );

    if (prefCookie) {
      return prefCookie.split("=")[1] === "true";
    }

    return true; // Par défaut activé
  }, []);

  // Sauvegarder la préférence dans les cookies
  const saveFavoritesFirstPreference = useCallback((value: boolean) => {
    if (typeof document === "undefined") return;

    document.cookie = `${FAVORITES_FIRST_COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }, []);

  return {
    getFavoritesFirstPreference,
    saveFavoritesFirstPreference,
  };
}
