"use client";

/**
 * Performance Chart Component
 * ============================
 * Displays portfolio value over time as an area chart.
 * Fetches REAL historical data from the backend based on transactions.
 * Shows empty state when no holdings or history exists.
 */

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/Card";
import { useState, useEffect } from "react";
import { usePortfolioStore } from "@/lib/store";
import { BarChart3, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface HistoryDataPoint {
    date: string;
    value: number;
}

export function PerformanceChart() {
    const [range, setRange] = useState("ALL");
    const [data, setData] = useState<HistoryDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { holdings, metrics, currentPortfolioId } = usePortfolioStore();

    // Fetch real portfolio history when range or portfolio changes
    useEffect(() => {
        const fetchHistory = async () => {
            if (!currentPortfolioId) return;
            
            setIsLoading(true);
            try {
                const response = await api.getPortfolioHistory(currentPortfolioId, range);
                setData(response.history || []);
            } catch (error) {
                console.error("Failed to fetch portfolio history:", error);
                setData([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [currentPortfolioId, range]);

    // Check if we have holdings
    const hasHoldings = holdings.length > 0 && (metrics?.total_value ?? 0) > 0;
    const hasHistoryData = data.length > 0;

    // Empty state when no holdings
    if (!hasHoldings) {
        return (
            <Card className="h-[400px] flex flex-col p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-semibold text-slate-900">Portfolio Performance</h3>
                        <p className="text-sm text-slate-500">Net worth over time</p>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    {/* Empty State SVG */}
                    <div className="w-40 h-32 mb-6 relative">
                        <svg viewBox="0 0 200 120" className="w-full h-full">
                            {/* Grid lines */}
                            <line x1="30" y1="20" x2="30" y2="100" stroke="#e2e8f0" strokeWidth="1"/>
                            <line x1="30" y1="100" x2="180" y2="100" stroke="#e2e8f0" strokeWidth="1"/>
                            <line x1="30" y1="60" x2="180" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4"/>
                            <line x1="30" y1="40" x2="180" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4"/>
                            <line x1="30" y1="80" x2="180" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4"/>
                            
                            {/* Placeholder chart line */}
                            <path 
                                d="M30 90 Q60 85 90 75 T150 55 T180 45" 
                                fill="none" 
                                stroke="#cbd5e1" 
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray="8 4"
                            />
                            
                            {/* Area under curve */}
                            <path 
                                d="M30 90 Q60 85 90 75 T150 55 T180 45 V100 H30 Z" 
                                fill="url(#emptyGradient)" 
                            />
                            
                            <defs>
                                <linearGradient id="emptyGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.3"/>
                                    <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-5 w-5 text-slate-400" />
                        <h4 className="text-lg font-medium text-slate-700">No Performance Data</h4>
                    </div>
                    <p className="text-sm text-slate-500 max-w-xs">
                        Add holdings to your portfolio to track performance over time
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-[400px] flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-slate-900">Portfolio Performance</h3>
                    <p className="text-sm text-slate-500">Net worth over time</p>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                    {["1M", "3M", "6M", "1Y", "ALL"].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0 -ml-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : !hasHistoryData ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-sm text-slate-500">No transaction history for this period</p>
                        <p className="text-xs text-slate-400 mt-1">Add transactions to see your portfolio growth</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                dy={10}
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
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(8px)'
                                }}
                                itemStyle={{ color: '#3b82f6', fontWeight: 600 }}
                                formatter={(value: number) => [`₹${(value ?? 0).toLocaleString('en-IN')}`, "Net Worth"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </Card>
    );
}
