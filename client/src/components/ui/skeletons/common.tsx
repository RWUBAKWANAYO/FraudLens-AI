import { Skeleton } from "../skeleton";

export function HeaderProfileSkeleton() {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-10 w-10 rounded-full bg-accent-foreground" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-[180px] bg-accent-foreground" />
        <Skeleton className="h-3 w-[180px] bg-accent-foreground" />
      </div>
    </div>
  );
}
