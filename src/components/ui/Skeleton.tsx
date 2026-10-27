import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function BatchCardSkeleton() {
  return (
    <div className="surface overflow-hidden p-3">
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      <div className="space-y-3 px-1 pt-4 pb-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
        <div className="flex items-end justify-between pt-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function BatchGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <BatchCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="surface-soft flex items-center gap-4 px-4 py-3"
        >
          <Skeleton className="size-12 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
