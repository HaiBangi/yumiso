import { RecipeListSkeleton } from "@/components/recipes/recipe-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecipesLoading() {
  return (
    <main className="min-h-screen">
      {/* Compact Header Skeleton */}
      <header className="relative overflow-hidden bg-gradient-to-r from-stone-300 to-stone-400 dark:from-stone-700 dark:to-stone-800">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div>
                <Skeleton className="h-7 w-32 mb-1" />
                <Skeleton className="h-4 w-40 hidden sm:block" />
              </div>
            </div>
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex gap-4 mb-8">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        <RecipeListSkeleton />
      </section>
    </main>
  );
}
