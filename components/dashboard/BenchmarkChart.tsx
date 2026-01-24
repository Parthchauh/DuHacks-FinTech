"use client";

import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area
} from "recharts";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { usePortfolioStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Loader2, TrendingUp, BarChart4 } from "lucide-react";

export function BenchmarkChart() {
    const { currentPortfolioId } = usePortfolioStore();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [benchmark, setBenchmark] = useState("^NSEI"); // Default NIFTY 50
    const [period, setPeriod] = useState("1Y");

    useEffect(() => {
        if (currentPortfolioId) {
            fetchData();
        }
    }, [currentPortfolioId, benchmark, period]);

    const fetchData = async () => {
        if (!currentPortfolioId) return;
        setLoading(true);
        try {
            const result = await api.getPortfolioBenchmark(currentPortfolioId, benchmark, period);
            setData(result);
        } catch (error) {
            console.error("Failed to fetch benchmark data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <Card className="p-6 h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
        );
    }

    if (!data || !data.comparison || data.comparison.length === 0) {
        return (
            <Card className="p-6 h-[400px] flex items-center justify-center text-slate-500">
                No sufficient historical data for comparison.
            </Card>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-lg">
                    <p className="font-semibold text-slate-900 mb-2">{label}</p>
                    {payload.map((entry: any) => (
                        <div key={entry.name} className="flex items-center gap-2 mb-1">
                            <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-slate-600">
                                {entry.name}: 
                            </span>
                            <span className="font-medium">
                                {Number(entry.value).toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <BarChart4 className="h-5 w-5 text-primary" />
                        Portfolio vs Benchmark
                    </h3>
                    <p className="text-sm text-slate-500">
                        Normalized comparison (Base = 100)
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <select 
                        value={benchmark}
                        onChange={(e) => setBenchmark(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="^NSEI">Nifty 50</option>
                        <option value="^BSESN">Sensex</option>
                    </select>

                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {['1M', '3M', '6M', '1Y'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                    period === p 
                                        ? 'bg-white text-primary shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Portfolio Return</p>
                        <p className={`font-bold ${data.portfolio_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.portfolio_return >= 0 ? '+' : ''}{data.portfolio_return}%
                        </p>
                    </div>
                </div>
                
                <div className="w-px h-8 bg-slate-200" />
                
                <div>
                    <p className="text-xs text-slate-500">Benchmark Return</p>
                    <p className={`font-bold ${data.benchmark_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.benchmark_return >= 0 ? '+' : ''}{data.benchmark_return}%
                    </p>
                </div>
                
                <div className="w-px h-8 bg-slate-200" />
                
                <div>
                    <p className="text-xs text-slate-500">Outperformance</p>
                    <p className={`font-bold ${data.outperformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.outperformance >= 0 ? '+' : ''}{data.outperformance}%
                    </p>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.comparison}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                            dataKey="date" 
                            stroke="#94a3b8" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                        />
                        <YAxis 
                            stroke="#94a3b8" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line 
                            type="monotone" 
                            dataKey="portfolio" 
                            name="My Portfolio" 
                            stroke="#2563eb" 
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="benchmark" 
                            name={benchmark === "^NSEI" ? "Nifty 50" : "Sensex"}
                            stroke="#94a3b8" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
