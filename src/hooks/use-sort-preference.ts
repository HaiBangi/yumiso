"use client";

import { useCallback } from "react";

const SORT_COOKIE_NAME = "user-sort-preference";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

export function useSortPreference() {
  // Récupérer la préférence de tri depuis les cookies
  const getSortPreference = useCallback((): string | null => {
    if (typeof document === "undefined") return null;
    
    const cookies = document.cookie.split(";");
    const sortCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${SORT_COOKIE_NAME}=`)
    );
    
    if (sortCookie) {
      return sortCookie.split("=")[1];
    }
    
    return null;
  }, []);

  // Sauvegarder la préférence de tri dans les cookies
  const saveSortPreference = useCallback((sortValue: string) => {
    if (typeof document === "undefined") return;
    
    // Ne pas sauvegarder "default" car c'est la valeur par défaut
    if (sortValue === "default") {
      // Supprimer le cookie si on revient au tri par défaut
      document.cookie = `${SORT_COOKIE_NAME}=; path=/; max-age=0`;
      return;
    }
    
    document.cookie = `${SORT_COOKIE_NAME}=${sortValue}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    console.log(`[useSortPreference] Saved sort preference: ${sortValue}`);
  }, []);

  // Effacer la préférence de tri
  const clearSortPreference = useCallback(() => {
    if (typeof document === "undefined") return;
    
    document.cookie = `${SORT_COOKIE_NAME}=; path=/; max-age=0`;
    console.log("[useSortPreference] Cleared sort preference");
  }, []);

  return {
    getSortPreference,
    saveSortPreference,
    clearSortPreference,
  };
}
