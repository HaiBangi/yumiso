"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface MainWrapperProps {
  children: React.ReactNode;
}

export function MainWrapper({ children }: MainWrapperProps) {
  const pathname = usePathname();

  // Pages qui n'ont pas de header (seulement les pages d'authentification)
  const noHeaderPages = ["/auth/signin", "/auth/signup"];
  const hasHeader = !noHeaderPages.some(page => pathname.startsWith(page) || pathname === page);

  // Scroll au top lors du changement de page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <main id="main-content" className={hasHeader ? "main-with-header" : ""}>
      {children}
    </main>
  );
}
