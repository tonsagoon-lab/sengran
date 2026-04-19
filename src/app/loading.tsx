import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-b from-orange-50 to-white border-b py-10 text-center space-y-3 px-4">
        <Skeleton className="h-9 w-80 mx-auto" />
        <Skeleton className="h-5 w-56 mx-auto" />
        <Skeleton className="h-12 w-full max-w-xl mx-auto" />
        <div className="flex gap-2 justify-center">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        </div>
      </div>
      {/* Section skeletons */}
      <div className="mx-auto max-w-7xl px-4 space-y-10">
        {Array.from({ length: 2 }).map((_, s) => (
          <div key={s} className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-white overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
