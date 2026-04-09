"use client";

/**
 * Rebalance Page — Dark Vault Theme
 * ====================================
 * Full-featured rebalancing hub:
 * - Quant pipeline trigger
 * - RebalancingDrawer with trades + harvest ops
 * - Dark vault aesthetic
 */

import { RebalanceWizard } from "@/components/dashboard/RebalanceWizard";
import RebalancingDrawer from "@/components/dashboard/RebalancingDrawer";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, Zap, TrendingUp, AlertTriangle, ChevronRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function RebalancePage() {
    const router = useRouter();
    const {
        isAuthenticated,
        holdings,
        metrics,
        trades,
        generateRebalancingPlan,
        isRebalancing,
    } = usePortfolioStore();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) router.push("/login");
    }, [isAuthenticated, router]);

    const maxDrift =
        holdings.length > 0
            ? Math.max(...holdings.map((h) => Math.abs((h.actual_allocation || 0) - h.target_allocation)))
            : 0;

    const handleGenerate = async () => {
        setIsGenerating(true);
        await generateRebalancingPlan();
        setIsGenerating(false);
        setIsDrawerOpen(true);
    };

    if (holdings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center p-10 rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 backdrop-blur-sm max-w-md w-full mx-auto">
                    <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5">
                        <Scale className="h-9 w-9 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Holdings to Rebalance</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Add some holdings to your portfolio first, then come back to generate a rebalancing plan.
                    </p>
                    <button
                        onClick={() => router.push("/dashboard/portfolio")}
                        className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-cyan-500/20"
                    >
                        Go to Portfolio <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="space-y-8"
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        >
            <RebalanceWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
            <RebalancingDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

            {/* Header */}
            <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Portfolio Rebalancing</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        AI-driven quant pipeline · Tax-aware · Indian equity optimized
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/20 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 bg-[#0d1320] transition-all text-sm font-medium"
                    >
                        <Scale className="h-4 w-4" /> Quick Wizard
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || isRebalancing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-60"
                    >
                        <Zap className="h-4 w-4" />
                        {isGenerating ? "Generating…" : "Generate Full Plan"}
                    </button>
                </div>
            </motion.div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        label: "Holdings",
                        value: holdings.length,
                        sub: "active positions",
                        color: "text-cyan-400",
                        icon: TrendingUp,
                    },
                    {
                        label: "Max Drift",
                        value: `${maxDrift.toFixed(1)}%`,
                        sub: maxDrift > 5 ? "Rebalancing needed" : "Within thresholds",
                        color: maxDrift > 5 ? "text-amber-400" : "text-emerald-400",
                        icon: AlertTriangle,
                    },
                    {
                        label: "Portfolio Value",
                        value: formatCurrency(metrics?.total_value || 0),
                        sub: "total assets",
                        color: "text-white",
                        icon: Scale,
                    },
                ].map((card, i) => (
                    <motion.div
                        key={i}
                        variants={item}
                        className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-5"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/15">
                                <card.icon className="h-4 w-4 text-cyan-400" />
                            </div>
                            <span className="text-xs text-slate-500 tracking-widest uppercase">{card.label}</span>
                        </div>
                        <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                        <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* Pipeline Info */}
            <motion.div
                variants={item}
                className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-6"
            >
                <h2 className="font-semibold text-white mb-5 text-sm tracking-widest uppercase">
                    9-Stage Rebalancing Pipeline
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { stage: "01", name: "Drift Detection", desc: "Identifies allocations outside thresholds" },
                        { stage: "02", name: "Signal Analysis", desc: "EMA, ADX, RSI regime classification" },
                        { stage: "03", name: "Risk Engine", desc: "Volatility-adjusted position sizing" },
                        { stage: "04", name: "Tax Engine", desc: "STCG/LTCG impact calculation" },
                        { stage: "05", name: "Factor & ESG", desc: "Portfolio factor exposure checks" },
                        { stage: "06", name: "Stress Testing", desc: "Scenario analysis & tolerance check" },
                        { stage: "07", name: "Glide Path", desc: "Goal-horizon-adjusted allocations" },
                        { stage: "08", name: "Trade Generation", desc: "Optimal buy/sell order creation" },
                        { stage: "09", name: "AI Summary", desc: "Natural language rebalancing rationale" },
                    ].map((s) => (
                        <div
                            key={s.stage}
                            className="flex items-start gap-3 p-3 rounded-xl bg-[#0a0e1a] border border-slate-800/60"
                        >
                            <span className="text-xs font-mono text-cyan-500/60 mt-0.5 w-6 flex-shrink-0">
                                {s.stage}
                            </span>
                            <div>
                                <p className="text-sm font-medium text-slate-200">{s.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-5 pt-5 border-t border-cyan-500/8">
                    {trades.length > 0 ? (
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            View {trades.length} pending trades <ChevronRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <p className="text-sm text-slate-500">
                            Click <strong className="text-cyan-400">Generate Full Plan</strong> to run the pipeline and see trade recommendations.
                        </p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
