import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-xl border bg-white overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Hero skeleton */}
      <div className="space-y-3 py-6">
        <Skeleton className="h-8 w-72 mx-auto" />
        <Skeleton className="h-5 w-48 mx-auto" />
        <Skeleton className="h-12 w-full max-w-xl mx-auto" />
      </div>
      {/* Filter bar skeleton */}
      <div className="sticky top-0 z-20 border-b bg-white py-2">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24 ml-auto" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
