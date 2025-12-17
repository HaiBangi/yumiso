"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface RecipePaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecipes: number;
  searchParams: { [key: string]: string | undefined };
}

export function RecipePagination({ 
  currentPage, 
  totalPages, 
  totalRecipes,
  searchParams 
}: RecipePaginationProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();

  // Scroll to top whenever currentPage changes
  useEffect(() => {
    // Force scroll to absolute top
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentPage]);

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(currentSearchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    return `?${params.toString()}`;
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    router.push(createPageUrl(page));
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const pages: (number | string)[] = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);
    
    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pages.push("...");
    }
    
    // Add pages around current page
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      pages.push("...");
    }
    
    // Always show last page if there's more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startRecipe = (currentPage - 1) * 20 + 1;
  const endRecipe = Math.min(currentPage * 20, totalRecipes);

  return (
    <div className="mt-8 sm:mt-12">
      {/* Recipe count info */}
      <div className="text-center mb-4">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Affichage de <span className="font-semibold text-emerald-600 dark:text-emerald-400">{startRecipe}</span> à{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{endRecipe}</span> sur{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalRecipes}</span> recette{totalRecipes > 1 ? "s" : ""}
        </p>
      </div>

      {/* Pagination controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {/* Mobile: Compact pagination */}
        <div className="flex sm:hidden items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="h-9 w-9 p-0"
            aria-label="Première page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-9 w-9 p-0"
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {currentPage} / {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-9 w-9 p-0"
            aria-label="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="h-9 w-9 p-0"
            aria-label="Dernière page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop: Full pagination with page numbers */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="h-9 gap-1"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="hidden lg:inline">Première</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-9 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden lg:inline">Précédent</span>
          </Button>

          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNum, idx) => {
              if (pageNum === "...") {
                return (
                  <span 
                    key={`ellipsis-${idx}`} 
                    className="px-2 text-stone-500 dark:text-stone-400"
                  >
                    ...
                  </span>
                );
              }

              const isActive = pageNum === currentPage;
              return (
                <Button
                  key={pageNum}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(pageNum as number)}
                  className={`h-9 w-9 p-0 ${
                    isActive 
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                      : ""
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-9 gap-1"
          >
            <span className="hidden lg:inline">Suivant</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="h-9 gap-1"
          >
            <span className="hidden lg:inline">Dernière</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}