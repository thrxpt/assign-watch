import { Skeleton } from "@/components/ui/skeleton";

export function ClassSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="w-48 rounded-lg" />
      <div className="flex w-full flex-col gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div className="space-y-2" key={index}>
            <Skeleton className="h-6 w-25" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-100" />
              <Skeleton className="h-4 w-75" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
