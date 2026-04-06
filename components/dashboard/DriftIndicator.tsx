"use client";

/**
 * DriftIndicator — Compact drift visual per position
 * ====================================================
 * Shows drift direction + magnitude for a single holding.
 * Used inside the RebalancingDrawer trade list.
 */

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface DriftIndicatorProps {
    symbol: string;
    currentWeight: number;
    targetWeight: number;
    driftPct: number;
    action: string;
}

export default function DriftIndicator({
    symbol,
    currentWeight,
    targetWeight,
    driftPct,
    action,
}: DriftIndicatorProps) {
    const isOver = driftPct > 0;
    const isUnder = driftPct < 0;
    const absDrift = Math.abs(driftPct);

    const getBarColor = () => {
        if (action === "REDUCE" || action === "SELL") return "bg-red-500";
        if (action === "INCREASE" || action === "BUY") return "bg-cyan-500";
        return "bg-slate-600";
    };

    const getTextColor = () => {
        if (action === "REDUCE" || action === "SELL") return "text-red-400";
        if (action === "INCREASE" || action === "BUY") return "text-cyan-400";
        return "text-slate-400";
    };

    const DriftIcon = isOver
        ? ArrowUpRight
        : isUnder
        ? ArrowDownRight
        : Minus;

    return (
        <div className="flex items-center gap-3 py-2">
            {/* Symbol */}
            <span className="w-20 text-xs font-bold text-white tracking-wider truncate">
                {symbol}
            </span>

            {/* Drift bar */}
            <div className="flex-1 relative">
                <div className="flex items-center gap-2">
                    {/* Target line at center */}
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 relative overflow-hidden">
                        <div
                            className={`absolute h-full rounded-full transition-all duration-500 ${getBarColor()}`}
                            style={{
                                width: `${Math.min(absDrift * 100 * 3, 100)}%`,
                                left: isUnder ? "auto" : "50%",
                                right: isUnder ? "50%" : "auto",
                            }}
                        />
                        {/* Center marker */}
                        <div className="absolute left-1/2 top-0 w-px h-full bg-slate-600" />
                    </div>
                </div>
            </div>

            {/* Weight labels */}
            <div className="flex items-center gap-2 min-w-[120px] justify-end">
                <span className="text-[10px] text-slate-500 tabular-nums">
                    {(currentWeight * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-700">→</span>
                <span className="text-[10px] text-cyan-400 tabular-nums">
                    {(targetWeight * 100).toFixed(1)}%
                </span>
            </div>

            {/* Drift value */}
            <div className={`flex items-center gap-1 min-w-[60px] justify-end ${getTextColor()}`}>
                <DriftIcon className="h-3 w-3" />
                <span className="text-xs font-bold tabular-nums">
                    {(absDrift * 100).toFixed(1)}%
                </span>
            </div>
        </div>
    );
}
