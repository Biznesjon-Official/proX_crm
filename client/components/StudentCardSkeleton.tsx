import { Skeleton } from "./ui/skeleton";

export default function StudentCardSkeleton() {
  return (
    <div className="card-hover p-4">
      <div className="flex items-start gap-3">
        {/* Avatar skeleton */}
        <Skeleton className="w-12 h-12 rounded-full" />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Name skeleton */}
          <Skeleton className="h-5 w-32" />
          
          {/* Phone skeleton */}
          <Skeleton className="h-4 w-24" />
          
          {/* Badge skeleton */}
          <Skeleton className="h-5 w-16" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Skeleton className="h-16 rounded" />
        <Skeleton className="h-16 rounded" />
        <Skeleton className="h-16 rounded" />
      </div>

      {/* Actions skeleton */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-1">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      </div>
    </div>
  );
}

export function StudentCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StudentCardSkeleton key={i} />
      ))}
    </div>
  );
}
