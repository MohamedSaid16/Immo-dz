import { PropertyGridSkeleton } from "@/components/public/property-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function BiensLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-4 w-40" />
      <PropertyGridSkeleton />
    </div>
  );
}
