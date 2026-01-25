"use client";

import { useEffect, useState } from "react";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { api } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

interface MonteCarloResult {
    percentile_5: number[];
    percentile_25: number[];
    percentile_50: number[];
    percentile_75: number[];
    percentile_95: number[];
    expected_value: number;
    var_95: number;
}

export function MonteCarloChart() {
    const { currentPortfolioId, holdings } = usePortfolioStore();
    const [result, setResult] = useState<MonteCarloResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [days, setDays] = useState(252);

    const runSimulation = async () => {
        if (!currentPortfolioId || holdings.length === 0) return;

        setIsLoading(true);
        try {
            const data = await api.runMonteCarlo(currentPortfolioId, days, 1000);
            setResult(data);
        } catch (error) {
            console.log('Failed to run Monte Carlo simulation');
        }
        setIsLoading(false);
    };

    // Convert to chart data
    const chartData = result ? result.percentile_50.map((value, i) => ({
        day: i,
        p5: result.percentile_5[i],
        p25: result.percentile_25[i],
        p50: result.percentile_50[i],
        p75: result.percentile_75[i],
        p95: result.percentile_95[i],
    })) : [];

    if (holdings.length === 0) {
        return (
            <div className="h-[400px] bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                Add holdings to run Monte Carlo simulation
            </div>
        );
    }

    return (
        <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <div>
                    <h3 className="font-bold text-slate-900">Monte Carlo Simulation</h3>
                    <p className="text-xs sm:text-sm text-slate-500">1,000 portfolio projections over {days} days</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 text-sm min-h-[44px]"
                    >
                        <option value={63}>3 Months</option>
                        <option value={126}>6 Months</option>
                        <option value={252}>1 Year</option>
                        <option value={504}>2 Years</option>
                    </select>
                    <Button onClick={runSimulation} disabled={isLoading} size="sm" className="min-h-[44px] whitespace-nowrap">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run'}
                    </Button>
                </div>
            </div>

            {!result ? (
                <div className="h-[300px] bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    Click "Run Simulation" to generate projections
                </div>
            ) : (
                <>
                    <div className="h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="p95" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#bbf7d0" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#bbf7d0" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <linearGradient id="p75" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#86efac" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#86efac" stopOpacity={0.2}/>
                                    </linearGradient>
                                    <linearGradient id="p50" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="day" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => `D${value}`}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                                        background: 'rgba(255, 255, 255, 0.95)',
                                    }}
                                    formatter={(value: any, name: string) => [
                                        `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                                        name === 'p95' ? '95th Percentile' :
                                        name === 'p75' ? '75th Percentile' :
                                        name === 'p50' ? 'Median' :
                                        name === 'p25' ? '25th Percentile' :
                                        '5th Percentile'
                                    ]}
                                />
                                <Area type="monotone" dataKey="p95" stroke="#86efac" fill="url(#p95)" />
                                <Area type="monotone" dataKey="p75" stroke="#4ade80" fill="url(#p75)" />
                                <Area type="monotone" dataKey="p50" stroke="#0ea5e9" strokeWidth={2} fill="url(#p50)" />
                                <Area type="monotone" dataKey="p25" stroke="#f97316" fill="#fed7aa" fillOpacity={0.3} />
                                <Area type="monotone" dataKey="p5" stroke="#ef4444" fill="#fecaca" fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-sm text-slate-500 mb-1">Expected Value</p>
                            <p className="text-xl font-bold text-slate-900">
                                {formatCurrency(result.expected_value)}
                            </p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4">
                            <p className="text-sm text-red-600 mb-1">Value at Risk (95%)</p>
                            <p className="text-xl font-bold text-red-700">
                                {formatCurrency(result.var_95)}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
}
