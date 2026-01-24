import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-40" />
          </Card>
        ))}
      </div>

      <Card className="p-6 h-[400px]">
        <Skeleton className="h-full w-full" />
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 h-[300px]">
          <Skeleton className="h-full w-full" />
        </Card>
        <Card className="p-6 h-[300px]">
          <Skeleton className="h-full w-full" />
        </Card>
      </div>
    </div>
  );
}
