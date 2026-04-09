/**
 * DashboardSkeleton — Dark Vault Theme
 * =======================================
 * Loading skeleton matching vault dark design.
 */

export function DashboardSkeleton() {
    const shimmer =
        "animate-pulse rounded-xl bg-gradient-to-r from-[#0d1320] via-[#1a2540] to-[#0d1320] bg-[length:200%_100%]";

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className={`h-7 w-64 ${shimmer}`} />
                    <div className={`h-4 w-80 ${shimmer}`} />
                </div>
                <div className="flex gap-2">
                    <div className={`h-10 w-24 ${shimmer}`} />
                    <div className={`h-10 w-24 ${shimmer}`} />
                    <div className={`h-10 w-28 ${shimmer}`} />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-cyan-500/8 bg-[#0d1320]/60 p-5"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`h-10 w-10 rounded-xl ${shimmer}`} />
                            <div className={`h-6 w-16 rounded-full ${shimmer}`} />
                        </div>
                        <div className={`h-3 w-20 mb-2 ${shimmer}`} />
                        <div className={`h-7 w-32 ${shimmer}`} />
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className={`rounded-2xl border border-cyan-500/8 bg-[#0d1320]/60 h-72 ${shimmer}`} />
                    <div className={`rounded-2xl border border-cyan-500/8 bg-[#0d1320]/60 h-48 ${shimmer}`} />
                </div>
                <div className="space-y-5">
                    <div className="rounded-2xl border border-cyan-500/8 bg-[#0d1320]/60 p-6 space-y-4">
                        <div className={`h-5 w-28 ${shimmer}`} />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-[#0a0e1a] rounded-xl">
                                <div className={`h-4 w-24 ${shimmer}`} />
                                <div className={`h-4 w-12 ${shimmer}`} />
                            </div>
                        ))}
                    </div>
                    <div className="rounded-2xl border border-cyan-500/8 bg-[#0d1320]/60 p-6 space-y-4">
                        <div className={`h-5 w-36 ${shimmer}`} />
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between">
                                <div className={`h-4 w-24 ${shimmer}`} />
                                <div className={`h-4 w-20 ${shimmer}`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
