import { Skeleton } from "@/components/ui/skeleton";

export function AdminStatsSkeletonLoader() {
  return (
    <div className="space-y-8 pb-8">
      {/* Users Section Skeleton */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* Recipes Section Skeleton */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Section Skeleton */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Activity Section Skeleton */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminUsersSkeletonLoader() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="p-6 border-b space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminLogsSkeletonLoader() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="p-6 border-b flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="p-0">
        <div className="px-6 py-3 bg-muted/50 border-b">
          <div className="grid grid-cols-[48px_160px_160px_1fr_120px] gap-3">
            <div />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="grid grid-cols-[48px_160px_160px_1fr_120px] gap-3 px-6 py-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
