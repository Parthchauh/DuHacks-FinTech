"use client";

/**
 * Analytics Page — Dark Vault Theme
 * ====================================
 * Quant metrics, charts, holdings performance table
 */

import { useEffect, useState } from "react";
import { Activity, BarChart2, TrendingUp, RefreshCw, Loader2, ShieldAlert } from "lucide-react";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { CorrelationHeatmap } from "@/components/dashboard/CorrelationHeatmap";
import { MonteCarloChart } from "@/components/dashboard/MonteCarloChart";
import { EfficientFrontierChart } from "@/components/dashboard/EfficientFrontierChart";
import { BenchmarkChart } from "@/components/dashboard/BenchmarkChart";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function getSharpeLabel(s: number) {
    if (s >= 3) return { text: "Excellent", color: "text-emerald-400" };
    if (s >= 2) return { text: "Very Good", color: "text-cyan-400" };
    if (s >= 1) return { text: "Good", color: "text-cyan-300" };
    if (s >= 0) return { text: "Acceptable", color: "text-amber-400" };
    return { text: "Poor", color: "text-red-400" };
}

export default function AnalyticsPage() {
    const router = useRouter();
    const { metrics, holdings, isAuthenticated, fetchMetrics } = usePortfolioStore();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) { router.push("/login"); return; }
    }, [isAuthenticated, router]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchMetrics();
        setIsRefreshing(false);
    };

    const sharpe = metrics?.sharpe_ratio || 0;
    const alpha = metrics?.alpha || 0;
    const beta = metrics?.beta || 1;
    const volatility = metrics?.volatility || 0;
    const sharpeLabel = getSharpeLabel(sharpe);

    const metricCards = [
        {
            label: "Sharpe Ratio",
            value: sharpe.toFixed(2),
            sub: sharpeLabel.text,
            icon: Activity,
            valueColor: sharpeLabel.color,
            iconBg: "from-indigo-500 to-violet-600",
        },
        {
            label: "Alpha",
            value: `${alpha >= 0 ? "+" : ""}${alpha.toFixed(1)}%`,
            sub: alpha >= 0 ? "Outperforming Nifty 50" : "Underperforming Nifty 50",
            icon: TrendingUp,
            valueColor: alpha >= 0 ? "text-emerald-400" : "text-red-400",
            iconBg: alpha >= 0 ? "from-cyan-500 to-teal-500" : "from-rose-500 to-red-600",
        },
        {
            label: "Beta",
            value: beta.toFixed(2),
            sub: beta < 1 ? "Less volatile than market" : beta > 1 ? "More volatile than market" : "Same volatility",
            icon: BarChart2,
            valueColor: "text-white",
            iconBg: "from-amber-500 to-orange-500",
        },
        {
            label: "Volatility",
            value: `${volatility.toFixed(1)}%`,
            sub: "Annualized std. deviation",
            icon: ShieldAlert,
            valueColor: volatility > 25 ? "text-red-400" : "text-slate-200",
            iconBg: "from-slate-500 to-slate-600",
        },
    ];

    return (
        <motion.div
            className="space-y-8"
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        >
            {/* Header */}
            <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Portfolio Analytics</h1>
                    <p className="text-slate-400 text-sm mt-1">Deep dive into performance, risk, and quant metrics.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/20 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 bg-[#0d1320] transition-all text-sm font-medium disabled:opacity-50"
                >
                    {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh Metrics
                </button>
            </motion.div>

            {/* Quant Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {metricCards.map((card, i) => (
                    <motion.div
                        key={i}
                        variants={item}
                        className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-5 hover:border-cyan-500/25 transition-all"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className={cn("p-2 rounded-xl bg-gradient-to-br", card.iconBg)}>
                                <card.icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-xs text-slate-500 tracking-widest uppercase">{card.label}</span>
                        </div>
                        <p className={cn("text-3xl font-bold", card.valueColor)}>{card.value}</p>
                        <p className="text-xs text-slate-500 mt-1.5">{card.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                <motion.div
                    variants={item}
                    className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-6"
                >
                    <h3 className="font-semibold text-white text-sm tracking-widest uppercase mb-5">Asset Correlation Matrix</h3>
                    <CorrelationHeatmap />
                </motion.div>
                <motion.div variants={item}>
                    <EfficientFrontierChart />
                </motion.div>
            </div>

            {/* Benchmark + MonteCarlo */}
            <motion.div variants={item}><BenchmarkChart /></motion.div>
            <motion.div variants={item}><MonteCarloChart /></motion.div>

            {/* Holdings Performance Table */}
            <motion.div variants={item} className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 overflow-hidden">
                <div className="px-6 py-4 border-b border-cyan-500/10">
                    <h3 className="font-semibold text-white text-sm tracking-widest uppercase">Holdings Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-cyan-500/8 text-xs tracking-widest uppercase text-slate-500">
                                <th className="px-6 py-3.5">Asset</th>
                                <th className="px-6 py-3.5 text-right">Current Value</th>
                                <th className="px-6 py-3.5 text-right">P&L</th>
                                <th className="px-6 py-3.5 text-right">Return %</th>
                                <th className="px-6 py-3.5 text-right">Allocation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-500/5">
                            {holdings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                                        No holdings yet. Add stocks to see analytics.
                                    </td>
                                </tr>
                            ) : (
                                [...holdings]
                                    .sort((a, b) => (b.profit_loss_percent || 0) - (a.profit_loss_percent || 0))
                                    .map((h) => (
                                        <tr key={h.ticker} className="hover:bg-cyan-500/3 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-slate-200">{h.ticker}</span>
                                                <p className="text-xs text-slate-500">{h.name}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-200">
                                                {formatCurrency(h.current_value || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn("font-medium", (h.profit_loss || 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                                                    {(h.profit_loss || 0) >= 0 ? "+" : ""}{formatCurrency(h.profit_loss || 0)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn("font-medium", (h.profit_loss_percent || 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                                                    {(h.profit_loss_percent || 0) >= 0 ? "+" : ""}{(h.profit_loss_percent || 0).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-400 text-sm">
                                                {(h.actual_allocation || 0).toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Risk Profile + Sector Allocation */}
            {metrics && (
                <div className="grid lg:grid-cols-2 gap-6">
                    <motion.div variants={item} className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-6">
                        <h3 className="font-semibold text-white text-sm tracking-widest uppercase mb-5">Risk Profile</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Risk Score</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all", metrics.risk_score <= 3 ? "bg-emerald-400" : metrics.risk_score <= 6 ? "bg-amber-400" : "bg-red-400")}
                                            style={{ width: `${metrics.risk_score * 10}%` }}
                                        />
                                    </div>
                                    <span className="font-bold text-white text-sm">{metrics.risk_score}/10</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Risk Level</span>
                                <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", metrics.risk_level === "Low" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : metrics.risk_level === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                                    {metrics.risk_level}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Diversification Score</span>
                                <span className="font-bold text-cyan-400">{metrics.diversification_score?.toFixed(0)}%</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={item} className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 p-6">
                        <h3 className="font-semibold text-white text-sm tracking-widest uppercase mb-5">Sector Allocation</h3>
                        {metrics.sector_concentration && Object.keys(metrics.sector_concentration).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(metrics.sector_concentration).map(([sector, pct]) => (
                                    <div key={sector} className="flex justify-between items-center gap-3">
                                        <span className="text-slate-400 text-sm truncate flex-1">{sector}</span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full" style={{ width: `${Math.min(pct as number, 100)}%` }} />
                                            </div>
                                            <span className="font-medium text-slate-300 text-sm w-10 text-right">{(pct as number).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm text-center py-4">No sector data available</p>
                        )}
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
