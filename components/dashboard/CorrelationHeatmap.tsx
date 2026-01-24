"use client";

import { useEffect, useState } from "react";
import { usePortfolioStore } from "@/lib/store";
import { api } from "@/lib/api";

interface CorrelationData {
    asset1: string;
    asset2: string;
    correlation: number;
}

export function CorrelationHeatmap() {
    const { currentPortfolioId, holdings } = usePortfolioStore();
    const [correlations, setCorrelations] = useState<CorrelationData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!currentPortfolioId || holdings.length < 2) return;

        const fetchCorrelation = async () => {
            setIsLoading(true);
            try {
                const result = await api.getCorrelationMatrix(currentPortfolioId);
                setCorrelations(result.correlations || []);
            } catch (error) {
                console.log('Failed to fetch correlation matrix');
            }
            setIsLoading(false);
        };

        fetchCorrelation();
    }, [currentPortfolioId, holdings.length]);

    // Get unique tickers
    const tickers = [...new Set(correlations.flatMap(c => [c.asset1, c.asset2]))];

    // Create correlation matrix
    const getCorrelation = (t1: string, t2: string): number => {
        if (t1 === t2) return 1;
        const found = correlations.find(
            c => (c.asset1 === t1 && c.asset2 === t2) || (c.asset1 === t2 && c.asset2 === t1)
        );
        return found?.correlation || 0;
    };

    const getColor = (correlation: number): string => {
        if (correlation >= 0.7) return 'bg-green-500';
        if (correlation >= 0.3) return 'bg-green-300';
        if (correlation >= -0.3) return 'bg-slate-200';
        if (correlation >= -0.7) return 'bg-red-300';
        return 'bg-red-500';
    };

    if (holdings.length < 2) {
        return (
            <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                <p className="text-center px-4">Add at least 2 holdings to view correlation matrix</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading correlation data...</div>
            </div>
        );
    }

    if (tickers.length === 0) {
        return (
            <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                No correlation data available
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr>
                        <th className="p-2 text-xs font-medium text-slate-500"></th>
                        {tickers.map(ticker => (
                            <th key={ticker} className="p-2 text-xs font-medium text-slate-500 text-center">
                                {ticker}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tickers.map(row => (
                        <tr key={row}>
                            <td className="p-2 text-xs font-medium text-slate-500">{row}</td>
                            {tickers.map(col => {
                                const corr = getCorrelation(row, col);
                                return (
                                    <td key={col} className="p-1">
                                        <div
                                            className={`aspect-square rounded flex items-center justify-center text-xs font-medium ${getColor(corr)} ${corr >= 0.3 || corr <= -0.3 ? 'text-white' : 'text-slate-700'}`}
                                            title={`${row} vs ${col}: ${corr.toFixed(2)}`}
                                        >
                                            {corr.toFixed(2)}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-500 rounded" />
                    <span>High +</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-slate-200 rounded" />
                    <span>Low</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-500 rounded" />
                    <span>High -</span>
                </div>
            </div>
        </div>
    );
}
