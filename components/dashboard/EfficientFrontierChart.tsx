"use client";

import { useEffect, useState } from "react";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { api } from "@/lib/api";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

interface FrontierPoint {
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
    weights: Record<string, number>;
}

interface OptimalPortfolio {
    weights: Record<string, number>;
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
}

export function EfficientFrontierChart() {
    const { currentPortfolioId, holdings } = usePortfolioStore();
    const [frontier, setFrontier] = useState<FrontierPoint[]>([]);
    const [optimal, setOptimal] = useState<OptimalPortfolio | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const calculateFrontier = async () => {
        if (!currentPortfolioId || holdings.length < 2) return;

        setIsLoading(true);
        try {
            const result = await api.getEfficientFrontier(currentPortfolioId);
            setFrontier(result.frontier || []);
            setOptimal(result.optimal_portfolio || null);
        } catch (error) {
            console.log('Failed to calculate efficient frontier');
        }
        setIsLoading(false);
    };

    if (holdings.length < 2) {
        return (
            <Card className="p-6">
                <h3 className="font-bold text-slate-900 mb-4">Efficient Frontier</h3>
                <div className="h-[300px] bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    Add at least 2 holdings to calculate efficient frontier
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-slate-900">Efficient Frontier</h3>
                    <p className="text-sm text-slate-500">Risk-return tradeoff analysis (MPT)</p>
                </div>
                <Button onClick={calculateFrontier} disabled={isLoading} size="sm">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Calculate'}
                </Button>
            </div>

            {frontier.length === 0 ? (
                <div className="h-[300px] bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    Click "Calculate" to generate efficient frontier
                </div>
            ) : (
                <>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="volatility" 
                                    name="Volatility" 
                                    unit="%" 
                                    type="number"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    label={{ value: 'Risk (Volatility %)', position: 'bottom', offset: 0, fill: '#64748b' }}
                                />
                                <YAxis 
                                    dataKey="expected_return" 
                                    name="Return" 
                                    unit="%" 
                                    type="number"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    label={{ value: 'Expected Return %', angle: -90, position: 'left', offset: 10, fill: '#64748b' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                                        background: 'rgba(255, 255, 255, 0.95)',
                                    }}
                                    formatter={(value: any, name: string) => [
                                        `${value.toFixed(2)}%`,
                                        name === 'volatility' ? 'Volatility' : 'Expected Return'
                                    ]}
                                />
                                {/* Frontier curve */}
                                <Scatter
                                    name="Efficient Frontier"
                                    data={frontier}
                                    fill="#0ea5e9"
                                    line={{ stroke: '#0ea5e9', strokeWidth: 2 }}
                                    shape="circle"
                                />
                                {/* Optimal portfolio point */}
                                {optimal && (
                                    <Scatter
                                        name="Optimal Portfolio"
                                        data={[{ volatility: optimal.volatility, expected_return: optimal.expected_return }]}
                                        fill="#10b981"
                                        shape="star"
                                    />
                                )}
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Optimal Portfolio Details */}
                    {optimal && (
                        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
                            <h4 className="font-semibold text-green-800 mb-3">Optimal Portfolio (Max Sharpe)</h4>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-green-600">Expected Return</p>
                                    <p className="text-lg font-bold text-green-800">{optimal.expected_return.toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-green-600">Volatility</p>
                                    <p className="text-lg font-bold text-green-800">{optimal.volatility.toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-green-600">Sharpe Ratio</p>
                                    <p className="text-lg font-bold text-green-800">{optimal.sharpe_ratio.toFixed(2)}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-green-600 mb-2">Recommended Weights:</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(optimal.weights).map(([ticker, weight]) => (
                                        <span key={ticker} className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                                            {ticker}: {(weight * 100).toFixed(1)}%
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
