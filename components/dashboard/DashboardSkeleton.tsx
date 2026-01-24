import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg bg-slate-200/50" />
          <Skeleton className="h-4 w-96 rounded-lg bg-slate-200/50" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24 rounded-xl bg-slate-200/50" />
          <Skeleton className="h-10 w-32 rounded-xl bg-slate-200/50" />
          <Skeleton className="h-10 w-40 rounded-xl bg-slate-200/50" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="glass-card" className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Skeleton className="h-10 w-10 rounded-full bg-slate-200/50" />
              <Skeleton className="h-6 w-16 rounded-full bg-slate-200/50" />
            </div>
            <Skeleton className="h-4 w-24 mb-2 bg-slate-200/50" />
            <Skeleton className="h-8 w-32 bg-slate-200/50" />
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card variant="glass-card" className="p-6 h-[400px]">
            <Skeleton className="h-full w-full rounded-xl bg-slate-200/50" />
          </Card>
        </div>

        <div className="space-y-6">
          {/* Portfolio Metrics Skeleton */}
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl border border-white/20 p-6 space-y-6">
            <Skeleton className="h-6 w-32 bg-slate-200/50" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
                  <Skeleton className="h-4 w-24 bg-slate-200/50" />
                  <Skeleton className="h-4 w-12 bg-slate-200/50" />
                </div>
              ))}
            </div>
          </div>

          {/* Holdings Count Skeleton */}
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl border border-white/20 p-6 space-y-4">
            <Skeleton className="h-6 w-40 bg-slate-200/50" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24 bg-slate-200/50" />
                <Skeleton className="h-4 w-8 bg-slate-200/50" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24 bg-slate-200/50" />
                <Skeleton className="h-4 w-20 bg-slate-200/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
