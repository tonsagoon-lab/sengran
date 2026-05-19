export function HomeSkeleton() {
  return (
    <main className="flex min-h-svh flex-col bg-white pb-[68px]">
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="space-y-1.5">
          <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
          <div className="h-5 w-40 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="flex gap-2">
          <div className="size-9 animate-pulse rounded-full bg-neutral-100" />
          <div className="size-9 animate-pulse rounded-full bg-neutral-100" />
        </div>
      </div>
      <div className="px-4 pt-3">
        <div className="h-11 animate-pulse rounded-xl bg-neutral-100" />
      </div>
      <div className="flex gap-2 px-4 pt-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 flex-1 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
      <div className="mt-5 px-4">
        <div className="mb-2.5 h-5 w-24 animate-pulse rounded bg-neutral-100" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
      <div className="mt-6 px-4">
        <div className="mb-2.5 h-5 w-32 animate-pulse rounded bg-neutral-100" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    </main>
  );
}
