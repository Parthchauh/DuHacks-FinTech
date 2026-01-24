"use client";

import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { RebalanceWizard } from "@/components/dashboard/RebalanceWizard";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortfolioPage() {
    const router = useRouter();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const { holdings, metrics, isAuthenticated, fetchPortfolios } = usePortfolioStore();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        fetchPortfolios();
    }, [isAuthenticated, router, fetchPortfolios]);

    // Calculate max drift
    const maxDrift = holdings.length > 0 
        ? Math.max(...holdings.map(h => Math.abs((h.actual_allocation || 0) - h.target_allocation)))
        : 0;
    
    const driftAsset = holdings.length > 0 
        ? holdings.reduce((prev, current) =>
            Math.abs((current.actual_allocation || 0) - current.target_allocation) > 
            Math.abs((prev.actual_allocation || 0) - prev.target_allocation) 
                ? current : prev
        )
        : null;

    return (
        <div className="space-y-8">
            <RebalanceWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Portfolio Management</h1>
                    <p className="text-slate-500">Track allocations and rebalance to targets.</p>
                </div>
                <Button onClick={() => setIsWizardOpen(true)} disabled={holdings.length === 0}>
                    Apply Rebalancing
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Charts & Analysis */}
                <div className="space-y-6">
                    <AllocationChart />

                    {holdings.length > 0 && (
                        <>
                            {maxDrift > 5 ? (
                                <Card className="bg-amber-50/50 border-amber-100 p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-amber-900">Significant Drift Detected</h3>
                                            <p className="text-sm text-amber-800 mt-1 mb-3">
                                                Your portfolio has drifted from targets.
                                                {driftAsset && ` ${driftAsset.ticker} is off by ${Math.abs((driftAsset.actual_allocation || 0) - driftAsset.target_allocation).toFixed(1)}%.`}
                                            </p>
                                            <Button
                                                size="sm"
                                                onClick={() => setIsWizardOpen(true)}
                                                className="bg-amber-200 text-amber-900 hover:bg-amber-300 border-none shadow-none"
                                            >
                                                View Rebalancing Plan
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ) : maxDrift > 2 ? (
                                <Card className="bg-blue-50/50 border-blue-100 p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-blue-900">Minor Drift</h3>
                                            <p className="text-sm text-blue-800 mt-1">
                                                Some allocations have drifted slightly. Consider rebalancing soon.
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ) : (
                                <Card className="bg-green-50/50 border-green-100 p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-green-900">Portfolio Balanced</h3>
                                            <p className="text-sm text-green-800 mt-1">
                                                Your allocations are within the target range. Great job!
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </>
                    )}

                    {/* Portfolio Stats */}
                    {metrics && (
                        <Card className="p-6">
                            <h3 className="font-semibold text-slate-900 mb-4">Portfolio Summary</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Value</span>
                                    <span className="font-semibold">{formatCurrency(metrics.total_value)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Invested</span>
                                    <span className="font-semibold">{formatCurrency(metrics.total_invested)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Return</span>
                                    <span className={`font-semibold ${metrics.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {metrics.total_return >= 0 ? '+' : ''}{formatCurrency(metrics.total_return)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Return %</span>
                                    <span className={`font-semibold ${metrics.total_return_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {metrics.total_return_percent >= 0 ? '+' : ''}{metrics.total_return_percent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right Column: Holdings Table */}
                <div className="lg:col-span-2">
                    <HoldingsTable />
                </div>
            </div>
        </div>
    );
}
