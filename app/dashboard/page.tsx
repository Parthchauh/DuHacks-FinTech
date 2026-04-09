"use client";

/**
 * OptiWealth Dashboard Page — Dark Vault Theme
 * ==============================================
 * Main portfolio overview with:
 * - Animated stat cards (value, return, risk, drift)
 * - Performance chart + Sector rotation insights
 * - Key metrics sidebar
 * - ChartModal mounted at page level
 */

import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import {
    TrendingUp,
    Activity,
    PieChart,
    IndianRupee,
    Download,
    RefreshCw,
} from "lucide-react";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { SectorRotationCard } from "@/components/dashboard/SectorRotationCard";
import { ChartModal } from "@/components/charts/ChartModal";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { downloadPortfolioReport } from "@/lib/report";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
    const router = useRouter();
    const {
        user,
        holdings,
        metrics,
        isAuthenticated,
        fetchUser,
        fetchPortfolios,
        fetchMetrics,
        isLoading,
        chartSymbol,
        setChartSymbol,
        prices,
    } = usePortfolioStore();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
        async function loadData() {
            if (isAuthenticated) {
                await Promise.all([fetchUser(), fetchPortfolios()]);
                setIsInitialLoad(false);
            }
        }
        loadData();
    }, [isAuthenticated, router, fetchUser, fetchPortfolios]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchMetrics();
        setIsRefreshing(false);
    };

    const handleDownload = () => {
        const reportHoldings = holdings.map((h) => ({
            ticker: h.ticker,
            name: h.name,
            price: h.current_price || h.avg_buy_price,
            balance: h.current_value || h.quantity * h.avg_buy_price,
            allocation: h.actual_allocation || 0,
            target: h.target_allocation,
        }));
        const totalBalance =
            metrics?.total_value ||
            reportHoldings.reduce((sum, h) => sum + h.balance, 0);
        downloadPortfolioReport(reportHoldings as any, totalBalance);
    };

    // Computed values
    const totalBalance =
        metrics?.total_value ||
        holdings.reduce(
            (sum, h) => sum + (h.current_value || h.quantity * h.avg_buy_price),
            0
        );
    const totalReturn = metrics?.total_return || 0;
    const totalReturnPercent = metrics?.total_return_percent || 0;
    const riskScore = metrics?.risk_score || 0;
    const riskLevel = metrics?.risk_level || "N/A";
    const maxDrift =
        holdings.length > 0
            ? Math.max(
                  ...holdings.map((h) =>
                      Math.abs((h.actual_allocation || 0) - h.target_allocation)
                  )
              )
            : 0;

    if (isInitialLoad || (isLoading && !isRefreshing && holdings.length === 0)) {
        return <DashboardSkeleton />;
    }

    return (
        <>
            <motion.div
                className="space-y-8"
                variants={container}
                initial="hidden"
                animate="show"
            >
                {/* Welcome Section */}
                <motion.div
                    variants={item}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">
                            Welcome back
                            {user?.full_name
                                ? `, ${user.full_name.split(" ")[0]}`
                                : ""}
                            <span className="text-cyan-400"> 👋</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Here&apos;s your vault overview for today.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/20 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-all text-sm font-medium disabled:opacity-50 bg-[#0d1320]"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                            />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={holdings.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/20 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-all text-sm font-medium disabled:opacity-50 bg-[#0d1320]"
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Download</span>
                        </button>
                        <button
                            onClick={() => router.push("/dashboard/rebalance")}
                            disabled={holdings.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 w-full sm:w-auto justify-center"
                        >
                            Rebalance
                        </button>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            title: "Total Value",
                            value: formatCurrency(totalBalance),
                            change: `${totalReturnPercent >= 0 ? "+" : ""}${totalReturnPercent.toFixed(1)}%`,
                            trend: totalReturnPercent >= 0 ? "up" : "down",
                            icon: IndianRupee,
                        },
                        {
                            title: "Total Return",
                            value: formatCurrency(Math.abs(totalReturn)),
                            change: `${totalReturnPercent >= 0 ? "+" : ""}${totalReturnPercent.toFixed(1)}%`,
                            trend: totalReturnPercent >= 0 ? "up" : "down",
                            icon: TrendingUp,
                        },
                        {
                            title: "Risk Score",
                            value: riskScore > 0 ? `${riskScore}/10` : "N/A",
                            change: riskLevel,
                            trend:
                                riskScore <= 4
                                    ? "down"
                                    : riskScore <= 6
                                    ? "neutral"
                                    : "up",
                            icon: Activity,
                        },
                        {
                            title: "Max Drift",
                            value: `${maxDrift.toFixed(1)}%`,
                            change:
                                maxDrift > 5 ? "Needs Rebalancing" : "On Target",
                            trend: maxDrift > 5 ? "up" : "neutral",
                            icon: PieChart,
                        },
                    ].map((stat, i) => (
                        <motion.div key={i} variants={item}>
                            {/* @ts-ignore */}
                            <StatCard {...stat} />
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div
                        variants={item}
                        className="lg:col-span-2 space-y-6"
                    >
                        <PerformanceChart />
                        <SectorRotationCard />
                    </motion.div>

                    <motion.div variants={item} className="space-y-5">
                        {/* Key Metrics Card */}
                        <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 backdrop-blur-sm p-6">
                            <h3 className="font-semibold text-white mb-5 text-sm tracking-widest uppercase">
                                Key Metrics
                            </h3>
                            <div className="space-y-3">
                                {[
                                    {
                                        label: "Sharpe Ratio",
                                        value: metrics?.sharpe_ratio?.toFixed(2) || "—",
                                        positive: (metrics?.sharpe_ratio || 0) > 0,
                                    },
                                    {
                                        label: "Volatility",
                                        value: metrics?.volatility
                                            ? `${metrics.volatility.toFixed(1)}%`
                                            : "—",
                                        positive: false,
                                    },
                                    {
                                        label: "Beta",
                                        value: metrics?.beta?.toFixed(2) || "—",
                                        positive: false,
                                    },
                                    {
                                        label: "Alpha",
                                        value: metrics?.alpha
                                            ? `${metrics.alpha >= 0 ? "+" : ""}${metrics.alpha.toFixed(1)}%`
                                            : "—",
                                        positive: (metrics?.alpha || 0) >= 0,
                                    },
                                    {
                                        label: "Diversification",
                                        value: metrics?.diversification_score
                                            ? `${metrics.diversification_score.toFixed(0)}%`
                                            : "—",
                                        positive: (metrics?.diversification_score || 0) > 60,
                                    },
                                ].map((m, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-3 bg-[#0a0e1a] rounded-xl border border-slate-800/60"
                                    >
                                        <span className="text-slate-400 text-sm">{m.label}</span>
                                        <span
                                            className={`font-bold text-sm ${
                                                m.value === "—"
                                                    ? "text-slate-600"
                                                    : m.positive
                                                    ? "text-cyan-400"
                                                    : "text-slate-200"
                                            }`}
                                        >
                                            {m.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Portfolio Summary */}
                        <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 backdrop-blur-sm p-6">
                            <h3 className="font-semibold text-white mb-5 text-sm tracking-widest uppercase">
                                Portfolio Summary
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Total Holdings</span>
                                    <span className="font-semibold text-white">
                                        {holdings.length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Total Invested</span>
                                    <span className="font-semibold text-cyan-400">
                                        {formatCurrency(metrics?.total_invested || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Daily Change</span>
                                    <span
                                        className={`font-semibold text-sm ${
                                            (metrics?.daily_change_percent || 0) >= 0
                                                ? "text-emerald-400"
                                                : "text-red-400"
                                        }`}
                                    >
                                        {(metrics?.daily_change_percent || 0) >= 0 ? "+" : ""}
                                        {(metrics?.daily_change_percent || 0).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Chart Modal — mounted at page level for stability */}
            {chartSymbol && (
                <ChartModal
                    symbol={chartSymbol}
                    currentPrice={prices[chartSymbol] ?? 0}
                    isOpen={true}
                    onClose={() => setChartSymbol(null)}
                />
            )}
        </>
    );
}
