/*
 * Skeleton placeholders: gray shapes in the layout of the real content
 * that show while data loads, so pages feel instant instead of spinning.
 */

export function Bone({ className = "" }: { className?: string }) {
  return <div className={`bl-skeleton rounded-lg ${className}`} aria-hidden />;
}

/** Rows like a list of leads or emails. */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-xl border border-[#202020] bg-[#0D0D0D] p-4">
          <Bone className="h-10 w-10 shrink-0 !rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-3.5 w-2/5" />
            <Bone className="h-3 w-3/5 opacity-70" />
          </div>
          <Bone className="hidden h-6 w-16 sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Columns like the pipeline board. */
export function SkeletonBoard({ columns = 4 }: { columns?: number }) {
  return (
    <div className="mt-6 flex gap-3 overflow-hidden" role="status" aria-label="Loading">
      {Array.from({ length: columns }).map((_, column) => (
        <div key={column} className="w-[260px] shrink-0 space-y-2.5 rounded-xl border border-[#202020] bg-[#0D0D0D] p-3">
          <Bone className="h-4 w-24" />
          {Array.from({ length: 3 - (column % 2) }).map((__, card) => (
            <div key={card} className="space-y-2 rounded-lg border border-[#202020] p-3">
              <Bone className="h-3.5 w-3/4" />
              <Bone className="h-3 w-1/2 opacity-70" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A full page: title, number cards and two panels. */
export function SkeletonPage({ cards = 4 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <Bone className="h-7 w-48" />
      <Bone className="mt-3 h-3.5 w-72 opacity-70" />
      <div className={`mt-6 grid grid-cols-2 gap-3 ${cards >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-[#202020] bg-[#0D0D0D] p-4">
            <Bone className="h-9 w-9 !rounded-xl" />
            <Bone className="mt-4 h-3 w-20 opacity-70" />
            <Bone className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
          <Bone className="h-4 w-36" />
          <Bone className="mt-5 h-40 w-full opacity-60" />
        </div>
        <div className="space-y-3 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
          <Bone className="h-4 w-28" />
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-3">
              <Bone className="h-8 w-8 shrink-0 !rounded-lg" />
              <Bone className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
