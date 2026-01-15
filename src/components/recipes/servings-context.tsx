"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ServingsContextType {
  servings: number;
  originalServings: number;
  multiplier: number;
  setServings: (servings: number) => void;
}

const ServingsContext = createContext<ServingsContextType | undefined>(undefined);

export function ServingsProvider({
  children,
  initialServings,
}: {
  children: ReactNode;
  initialServings: number;
}) {
  const [servings, setServings] = useState(initialServings);
  const multiplier = servings / initialServings;

  return (
    <ServingsContext.Provider
      value={{
        servings,
        originalServings: initialServings,
        multiplier,
        setServings,
      }}
    >
      {children}
    </ServingsContext.Provider>
  );
}

export function useServings() {
  const context = useContext(ServingsContext);
  if (context === undefined) {
    throw new Error("useServings must be used within a ServingsProvider");
  }
  return context;
}
