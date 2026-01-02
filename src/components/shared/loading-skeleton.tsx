import { cn } from '@/lib/utils';

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <div className="space-y-4">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24 ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="min-w-[300px] w-80 rounded-lg border bg-card">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-6 w-8" />
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2 min-h-[200px]">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-24 w-full rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-10 w-16" />
          </div>
        ))}
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
    />
  );
}
