"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Activity, BarChart2, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { CorrelationHeatmap } from "@/components/dashboard/CorrelationHeatmap";
import { MonteCarloChart } from "@/components/dashboard/MonteCarloChart";
import { EfficientFrontierChart } from "@/components/dashboard/EfficientFrontierChart";
import { BenchmarkChart } from "@/components/dashboard/BenchmarkChart";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function AnalyticsPage() {
    const router = useRouter();
    const { metrics, holdings, isAuthenticated, fetchMetrics } = usePortfolioStore();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
    }, [isAuthenticated, router]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchMetrics();
        setIsRefreshing(false);
    };

    const sharpeRatio = metrics?.sharpe_ratio || 0;
    const alpha = metrics?.alpha || 0;
    const beta = metrics?.beta || 1;
    const volatility = metrics?.volatility || 0;

    // Sharpe interpretation
    const getSharpeInterpretation = (sharpe: number): string => {
        if (sharpe >= 3) return "Excellent";
        if (sharpe >= 2) return "Very Good";
        if (sharpe >= 1) return "Good";
        if (sharpe >= 0) return "Acceptable";
        return "Poor";
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Portfolio Analytics</h1>
                    <p className="text-slate-500">Deep dive into your portfolio performance and risk metrics.</p>
                </div>
                <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
                    {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh Metrics
                </Button>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Activity className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-white/90">Sharpe Ratio</h3>
                    </div>
                    <div className="text-3xl font-bold mb-2">{sharpeRatio.toFixed(2)}</div>
                    <p className="text-white/70 text-sm">{getSharpeInterpretation(sharpeRatio)}</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Alpha</h3>
                    </div>
                    <div className={`text-3xl font-bold ${alpha >= 0 ? 'text-green-600' : 'text-red-600'} mb-2`}>
                        {alpha >= 0 ? '+' : ''}{alpha.toFixed(1)}%
                    </div>
                    <p className="text-slate-500 text-sm">
                        {alpha >= 0 ? 'Outperforming' : 'Underperforming'} vs Nifty 50
                    </p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <BarChart2 className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Beta</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">{beta.toFixed(2)}</div>
                    <p className="text-slate-500 text-sm">
                        {beta < 1 ? 'Less volatile' : beta > 1 ? 'More volatile' : 'Same volatility'} than market
                    </p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <Activity className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Volatility</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">{volatility.toFixed(1)}%</div>
                    <p className="text-slate-500 text-sm">Annualized standard deviation</p>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-8">
                <Card className="p-6">
                    <h3 className="font-bold text-slate-900 mb-6">Asset Correlation Matrix</h3>
                    <CorrelationHeatmap />
                </Card>
                
                <EfficientFrontierChart />
            </div>

            {/* Benchmark Comparison */}
            <BenchmarkChart />

            {/* Monte Carlo */}
            <MonteCarloChart />

            {/* Top Performers */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900">Holdings Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Asset</th>
                                <th className="px-6 py-4 text-right">Current Value</th>
                                <th className="px-6 py-4 text-right">P&L</th>
                                <th className="px-6 py-4 text-right">Return %</th>
                                <th className="px-6 py-4 text-right">Allocation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {holdings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No holdings yet. Add some stocks to see analytics.
                                    </td>
                                </tr>
                            ) : (
                                [...holdings]
                                    .sort((a, b) => (b.profit_loss_percent || 0) - (a.profit_loss_percent || 0))
                                    .map((holding) => (
                                        <tr key={holding.ticker} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-900">{holding.ticker}</span>
                                                <p className="text-xs text-slate-500">{holding.name}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-900">
                                                {formatCurrency(holding.current_value || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-medium ${(holding.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {(holding.profit_loss || 0) >= 0 ? '+' : ''}{formatCurrency(holding.profit_loss || 0)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-medium ${(holding.profit_loss_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {(holding.profit_loss_percent || 0) >= 0 ? '+' : ''}{(holding.profit_loss_percent || 0).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600">
                                                {(holding.actual_allocation || 0).toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Risk Analysis */}
            {metrics && (
                <div className="grid lg:grid-cols-2 gap-8">
                    <Card className="p-6">
                        <h3 className="font-bold text-slate-900 mb-4">Risk Profile</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">Risk Score</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${
                                                metrics.risk_score <= 3 ? 'bg-green-500' :
                                                metrics.risk_score <= 6 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${metrics.risk_score * 10}%` }}
                                        />
                                    </div>
                                    <span className="font-bold text-slate-900">{metrics.risk_score}/10</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">Risk Level</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    metrics.risk_level === 'Low' ? 'bg-green-100 text-green-700' :
                                    metrics.risk_level === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    {metrics.risk_level}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">Diversification Score</span>
                                <span className="font-bold text-slate-900">{metrics.diversification_score.toFixed(0)}%</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-bold text-slate-900 mb-4">Sector Allocation</h3>
                        {metrics.sector_concentration && Object.keys(metrics.sector_concentration).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(metrics.sector_concentration).map(([sector, pct]) => (
                                    <div key={sector} className="flex justify-between items-center">
                                        <span className="text-slate-600">{sector}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${Math.min(pct as number, 100)}%` }}
                                                />
                                            </div>
                                            <span className="font-medium text-slate-900 w-12 text-right">
                                                {(pct as number).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center py-4">No sector data available</p>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
