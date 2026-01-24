"use client";

/**
 * Dividend Card Component
 * ========================
 * Displays dividend income summary with monthly breakdown.
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { usePortfolioStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DollarSign, TrendingUp, Loader2, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface DividendSummary {
    total_dividends: number;
    ytd_dividends: number;
    monthly_average: number;
    last_12_months: Array<{ month: string; amount: number }>;
    top_payers: Array<{ ticker: string; name: string; total: number }>;
}

export function DividendCard() {
    const { currentPortfolioId } = usePortfolioStore();
    const [summary, setSummary] = useState<DividendSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchDividends = async () => {
            if (!currentPortfolioId) return;

            setIsLoading(true);
            try {
                const response = await fetch(
                    `http://localhost:8000/api/dividends/summary?portfolio_id=${currentPortfolioId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                        },
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    setSummary(data);
                }
            } catch (error) {
                console.error("Failed to fetch dividend summary:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDividends();
    }, [currentPortfolioId]);

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
            </Card>
        );
    }

    const hasData = summary && summary.total_dividends > 0;

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Dividend Income</h3>
                        <p className="text-xs text-slate-500">Track your passive income</p>
                    </div>
                </div>
            </div>

            {!hasData ? (
                <div className="text-center py-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Plus className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 mb-2">No dividends recorded</p>
                    <p className="text-xs text-slate-400">Add dividend entries to track income</p>
                </div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">YTD Income</p>
                            <p className="text-xl font-bold text-green-700">
                                ₹{summary.ytd_dividends.toLocaleString("en-IN")}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">Monthly Avg</p>
                            <p className="text-xl font-bold text-blue-700">
                                ₹{summary.monthly_average.toLocaleString("en-IN")}
                            </p>
                        </div>
                    </div>

                    {/* Monthly Chart */}
                    <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summary.last_12_months}>
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{
                                        background: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                    }}
                                    formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Dividends"]}
                                />
                                <Bar 
                                    dataKey="amount" 
                                    fill="#10B981" 
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Top Payers */}
                    {summary.top_payers.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-2">Top Dividend Payers</p>
                            <div className="space-y-2">
                                {summary.top_payers.slice(0, 3).map((payer) => (
                                    <div key={payer.ticker} className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700">{payer.ticker}</span>
                                        <span className="text-sm text-green-600">₹{payer.total.toLocaleString("en-IN")}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
