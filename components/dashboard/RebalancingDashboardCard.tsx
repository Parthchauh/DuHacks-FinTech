"use client";

/**
 * RebalancingDashboardCard — Dark-vault-themed overview card
 * ===========================================================
 * Shows at-a-glance rebalancing status in the dashboard:
 *  - Drift score gauge
 *  - Trade count badges (buy/sell)
 *  - Last rebalanced timestamp
 *  - Quick-action "Run Rebalance" button
 */

import { useState, useCallback } from "react";
import {
    BarChart3,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    Loader2,
    RefreshCw,
    TrendingDown,
    TrendingUp,
} from "lucide-react";

interface RebalancingCardProps {
    portfolioId: string;
    driftScore?: number;
    buyCount?: number;
    sellCount?: number;
    lastRebalanced?: string;
    onRunRebalance?: () => void;
    isLoading?: boolean;
}

function getDriftStatus(drift: number) {
    if (drift <= 0.03)
        return {
            label: "Balanced",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            icon: CheckCircle2,
        };
    if (drift <= 0.08)
        return {
            label: "Minor Drift",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            icon: AlertTriangle,
        };
    return {
        label: "Needs Rebalance",
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        icon: TrendingDown,
    };
}

export default function RebalancingDashboardCard({
    portfolioId,
    driftScore = 0,
    buyCount = 0,
    sellCount = 0,
    lastRebalanced,
    onRunRebalance,
    isLoading = false,
}: RebalancingCardProps) {
    const status = getDriftStatus(driftScore);
    const StatusIcon = status.icon;

    return (
        <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/60 backdrop-blur-xl p-6 shadow-lg shadow-cyan-500/5 hover:border-cyan-500/20 transition-all group">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <BarChart3 className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                            Smart Rebalance
                        </h3>
                        <p className="text-xs text-slate-500 tracking-wide">
                            9-Stage CFA Pipeline
                        </p>
                    </div>
                </div>
                <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${status.bg} ${status.border} border`}
                >
                    <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                    <span
                        className={`text-xs font-bold tracking-wider ${status.color}`}
                    >
                        {status.label}
                    </span>
                </div>
            </div>

            {/* Drift Score Gauge */}
            <div className="relative mb-5">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-slate-500 tracking-widest uppercase">
                        Drift Score
                    </span>
                    <span
                        className={`text-2xl font-bold ${status.color} tabular-nums`}
                    >
                        {(driftScore * 100).toFixed(1)}%
                    </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            driftScore <= 0.03
                                ? "bg-emerald-500"
                                : driftScore <= 0.08
                                ? "bg-amber-500"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(driftScore * 100 * 5, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-600 tracking-wider">
                        0%
                    </span>
                    <span className="text-[10px] text-slate-600 tracking-wider">
                        &gt;20%
                    </span>
                </div>
            </div>

            {/* Trade Counts */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-xl bg-[#0a0e1a] border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowUpRight className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-xs text-slate-500 tracking-wider uppercase">
                            Buy
                        </span>
                    </div>
                    <p className="text-xl font-bold text-cyan-400 tabular-nums">
                        {buyCount}
                    </p>
                </div>
                <div className="p-3 rounded-xl bg-[#0a0e1a] border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowDownRight className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-xs text-slate-500 tracking-wider uppercase">
                            Sell
                        </span>
                    </div>
                    <p className="text-xl font-bold text-amber-400 tabular-nums">
                        {sellCount}
                    </p>
                </div>
            </div>

            {/* Last rebalanced */}
            {lastRebalanced && (
                <p className="text-[10px] text-slate-600 tracking-wider mb-4">
                    Last rebalanced: {lastRebalanced}
                </p>
            )}

            {/* Action Button */}
            <button
                onClick={onRunRebalance}
                disabled={isLoading}
                className="w-full py-3 text-xs font-bold tracking-[0.25em] uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
            >
                {isLoading ? (
                    <Loader2 className="animate-spin mx-auto h-4 w-4" />
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Run Rebalance
                    </span>
                )}
            </button>
        </div>
    );
}
