// components/home/home-skeleton.tsx — loading skeleton matching Home layout
export function HomeSkeleton() {
  return (
    <main className="flex min-h-svh flex-col bg-white pb-[68px]">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-neutral-100" />
          <div className="h-5 w-40 rounded bg-neutral-100" />
        </div>
        <div className="flex gap-2">
          <div className="size-9 rounded-full bg-neutral-100" />
          <div className="size-9 rounded-full bg-neutral-100" />
        </div>
      </div>
      {/* Search skeleton */}
      <div className="px-4 pt-3">
        <div className="h-11 rounded-xl bg-neutral-100" />
      </div>
      {/* Pills */}
      <div className="flex gap-2 px-4 pt-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 flex-1 rounded-xl bg-neutral-100" />
        ))}
      </div>
      {/* Category grid skeleton */}
      <div className="mt-5 grid grid-cols-4 gap-2 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-xl bg-neutral-100" />
        ))}
      </div>
      {/* Card grid skeleton */}
      <div className="mt-6 grid grid-cols-2 gap-3 px-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-xl bg-neutral-100" />
        ))}
      </div>
    </main>
  );
}
