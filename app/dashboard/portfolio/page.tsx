"use client";

import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePortfolioStore } from "@/lib/store";
import { RebalanceWizard } from "@/components/dashboard/RebalanceWizard";
import { useState } from "react";

export default function PortfolioPage() {
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const { holdings } = usePortfolioStore();

    const maxDrift = Math.max(...holdings.map(h => Math.abs(h.allocation - h.target)));
    const driftAsset = holdings.reduce((prev, current) =>
        Math.abs(current.allocation - current.target) > Math.abs(prev.allocation - prev.target) ? current : prev
    );

    return (
        <div className="space-y-8">
            <RebalanceWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Portfolio Management</h1>
                    <p className="text-slate-500">Track allocations and rebalance to targets.</p>
                </div>
                <Button onClick={() => setIsWizardOpen(true)}>
                    Apply Rebalancing
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Charts & Analysis */}
                <div className="space-y-6">
                    <AllocationChart />

                    {maxDrift > 2 ? (
                        <Card className="bg-amber-50/50 border-amber-100 p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-amber-900">Drift Detected</h3>
                                    <p className="text-sm text-amber-800 mt-1 mb-3">
                                        Your portfolio has drifted significantly.
                                        {driftAsset.ticker} is off by {Math.abs(driftAsset.allocation - driftAsset.target).toFixed(1)}%.
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
                    ) : (
                        <Card className="bg-green-50/50 border-green-100 p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-green-900">Portfolio Balanced</h3>
                                    <p className="text-sm text-green-800 mt-1">
                                        Your allocations are within the target range. Good job!
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    <Card className="bg-slate-50/50 border-slate-100 p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Tax Efficiency</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    No tax-loss harvesting opportunities detected at this time.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Holdings Table */}
                <div className="lg:col-span-2">
                    <HoldingsTable />
                </div>
            </div>
        </div>
    );
}
