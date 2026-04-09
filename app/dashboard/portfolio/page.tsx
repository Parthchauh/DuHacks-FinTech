"use client";

/**
 * Portfolio Management Page — Dark Vault Theme
 * ===============================================
 * Allocation chart + Holdings table + drift alert cards
 */

import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { AlertTriangle, CheckCircle2, ChevronRight, Scale } from "lucide-react";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { RebalanceWizard } from "@/components/dashboard/RebalanceWizard";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChartModal } from "@/components/charts/ChartModal";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function PortfolioPage() {
    const router = useRouter();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const { holdings, metrics, isAuthenticated, fetchPortfolios, chartSymbol, setChartSymbol, prices } =
        usePortfolioStore();

    useEffect(() => {
        if (!isAuthenticated) { router.push("/login"); return; }
        fetchPortfolios();
    }, [isAuthenticated, router, fetchPortfolios]);

    const maxDrift =
        holdings.length > 0
            ? Math.max(...holdings.map((h) => Math.abs((h.actual_allocation || 0) - h.target_allocation)))
            : 0;

    const driftAsset =
        holdings.length > 0
            ? holdings.reduce((prev, cur) =>
                  Math.abs((cur.actual_allocation || 0) - cur.target_allocation) >
                  Math.abs((prev.actual_allocation || 0) - prev.target_allocation)
                      ? cur
                      : prev
              )
            : null;

    return (
        <motion.div
            className="space-y-8"
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        >
            <RebalanceWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />

            {/* Header */}
            <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Portfolio Management</h1>
                    <p className="text-slate-400 text-sm mt-1">Track allocations and rebalance to targets.</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    disabled={holdings.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 w-full sm:w-auto justify-center"
                >
                    <Scale className="h-4 w-4" /> Apply Rebalancing
                </button>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left: Charts & Analysis */}
                <motion.div variants={item} className="space-y-5">
                    <AllocationChart />

                    {holdings.length > 0 && (
                        <>
                            {maxDrift > 5 ? (
                                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-amber-500/15 rounded-xl">
                                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-amber-300 text-sm">Significant Drift</h3>
                                            <p className="text-xs text-amber-400/70 mt-1 mb-3">
                                                {driftAsset
                                                    ? `${driftAsset.ticker} is off by ${Math.abs((driftAsset.actual_allocation || 0) - driftAsset.target_allocation).toFixed(1)}%.`
                                                    : "Portfolio has drifted from targets."}
                                            </p>
                                            <button
                                                onClick={() => setIsWizardOpen(true)}
                                                className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                                            >
                                                View Plan <ChevronRight className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : maxDrift > 2 ? (
                                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-cyan-500/15 rounded-xl">
                                            <AlertTriangle className="h-5 w-5 text-cyan-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-cyan-300 text-sm">Minor Drift</h3>
                                            <p className="text-xs text-slate-400 mt-1">Allocations drifted slightly — consider rebalancing soon.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-emerald-500/15 rounded-xl">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-emerald-300 text-sm">Portfolio Balanced</h3>
                                            <p className="text-xs text-slate-400 mt-1">Allocations are within the target range. Great job!</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Portfolio Stats */}
                    {metrics && (
                        <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-5">
                            <h3 className="font-semibold text-white text-sm tracking-widest uppercase mb-4">Portfolio Summary</h3>
                            <div className="space-y-3">
                                {[
                                    { label: "Total Value", value: formatCurrency(metrics.total_value), color: "text-cyan-400" },
                                    { label: "Total Invested", value: formatCurrency(metrics.total_invested), color: "text-slate-200" },
                                    {
                                        label: "Total Return",
                                        value: `${metrics.total_return >= 0 ? "+" : ""}${formatCurrency(metrics.total_return)}`,
                                        color: metrics.total_return >= 0 ? "text-emerald-400" : "text-red-400",
                                    },
                                    {
                                        label: "Return %",
                                        value: `${metrics.total_return_percent >= 0 ? "+" : ""}${metrics.total_return_percent.toFixed(2)}%`,
                                        color: metrics.total_return_percent >= 0 ? "text-emerald-400" : "text-red-400",
                                    },
                                ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">{row.label}</span>
                                        <span className={`font-semibold text-sm ${row.color}`}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Right: Holdings Table */}
                <motion.div variants={item} className="lg:col-span-2">
                    <HoldingsTable />
                </motion.div>
            </div>

            {/* Chart Modal */}
            {chartSymbol && (
                <ChartModal symbol={chartSymbol} currentPrice={prices[chartSymbol] ?? 0} isOpen onClose={() => setChartSymbol(null)} />
            )}
        </motion.div>
    );
}
