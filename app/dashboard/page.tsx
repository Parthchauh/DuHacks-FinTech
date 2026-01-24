"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { TrendingUp, Activity, PieChart, IndianRupee, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { downloadPortfolioReport } from "@/lib/report";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
        isLoading 
    } = usePortfolioStore();
    
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            // return; // Don't return here to ensure hooks run, but in practice the push handles it
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
        // Convert holdings for report
        const reportHoldings = holdings.map(h => ({
            ticker: h.ticker,
            name: h.name,
            price: h.current_price || h.avg_buy_price,
            balance: h.current_value || h.quantity * h.avg_buy_price,
            allocation: h.actual_allocation || 0,
            target: h.target_allocation
        }));
        const totalBalance = metrics?.total_value || reportHoldings.reduce((sum, h) => sum + h.balance, 0);
        downloadPortfolioReport(reportHoldings as any, totalBalance);
    };

    // Calculated values
    const totalBalance = metrics?.total_value || holdings.reduce((sum, h) => sum + (h.current_value || h.quantity * h.avg_buy_price), 0);
    const totalReturn = metrics?.total_return || 0;
    const totalReturnPercent = metrics?.total_return_percent || 0;
    const riskScore = metrics?.risk_score || 0;
    const riskLevel = metrics?.risk_level || "N/A";
    
    // Calculate max drift
    const maxDrift = holdings.length > 0 
        ? Math.max(...holdings.map(h => Math.abs((h.actual_allocation || 0) - h.target_allocation)))
        : 0;

    // Show skeleton during initial load or explicit loading state
    if (isInitialLoad || (isLoading && !isRefreshing && holdings.length === 0)) {
        return <DashboardSkeleton />;
    }

    return (
        <motion.div
            className="space-y-8"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
                    </h1>
                    <p className="text-slate-500">Here's what's happening with your portfolio today.</p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={handleDownload} disabled={holdings.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Download Report
                    </Button>
                    <Button onClick={() => router.push('/dashboard/rebalance')} disabled={holdings.length === 0}>
                        Rebalance Portfolio
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        title: "Total Balance", 
                        value: formatCurrency(totalBalance), 
                        change: `${totalReturnPercent >= 0 ? '+' : ''}${totalReturnPercent.toFixed(1)}%`, 
                        trend: totalReturnPercent >= 0 ? "up" : "down", 
                        icon: IndianRupee 
                    },
                    { 
                        title: "Total Return", 
                        value: formatCurrency(Math.abs(totalReturn)), 
                        change: `${totalReturnPercent >= 0 ? '+' : ''}${totalReturnPercent.toFixed(1)}%`, 
                        trend: totalReturnPercent >= 0 ? "up" : "down", 
                        icon: TrendingUp 
                    },
                    { 
                        title: "Risk Score", 
                        value: riskScore > 0 ? `${riskScore}/10` : "N/A", 
                        change: riskLevel, 
                        trend: riskScore <= 4 ? "down" : riskScore <= 6 ? "neutral" : "up", 
                        icon: Activity 
                    },
                    { 
                        title: "Max Drift", 
                        value: `${maxDrift.toFixed(1)}%`, 
                        change: maxDrift > 5 ? "Needs Rebalancing" : "On Target", 
                        trend: maxDrift > 5 ? "up" : "neutral", 
                        icon: PieChart 
                    }
                ].map((stat, i) => (
                    <motion.div key={i} variants={item}>
                        <StatCard // @ts-ignore
                            {...stat}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid lg:grid-cols-3 gap-8">
                <motion.div variants={item} className="lg:col-span-2 space-y-6">
                    <PerformanceChart />
                </motion.div>

                <motion.div variants={item} className="space-y-6">
                    {/* Portfolio Metrics */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-semibold text-slate-900 mb-6">Key Metrics</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600">Sharpe Ratio</span>
                                <span className="font-bold text-slate-900">
                                    {metrics?.sharpe_ratio?.toFixed(2) || "—"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600">Volatility</span>
                                <span className="font-bold text-slate-900">
                                    {metrics?.volatility ? `${metrics.volatility.toFixed(1)}%` : "—"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600">Beta</span>
                                <span className="font-bold text-slate-900">
                                    {metrics?.beta?.toFixed(2) || "—"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600">Alpha</span>
                                <span className={`font-bold ${(metrics?.alpha || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {metrics?.alpha ? `${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(1)}%` : "—"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600">Diversification</span>
                                <span className="font-bold text-slate-900">
                                    {metrics?.diversification_score ? `${metrics.diversification_score.toFixed(0)}%` : "—"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Holdings Count */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-semibold text-slate-900 mb-4">Portfolio Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total Holdings</span>
                                <span className="font-semibold">{holdings.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total Invested</span>
                                <span className="font-semibold">{formatCurrency(metrics?.total_invested || 0)}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
