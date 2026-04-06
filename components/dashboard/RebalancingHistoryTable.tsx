"use client";

/**
 * RebalancingHistoryTable — Past rebalancing reports table
 * =========================================================
 * Expandable rows showing past rebalancing runs with:
 *  - Date, trigger, drift score, trade count, tax impact
 *  - Expand to show AI summary
 */

import { useState, useEffect } from "react";
import {
    ChevronDown,
    ChevronRight,
    Clock,
    History,
    Loader2,
    Sparkles,
} from "lucide-react";

interface RebalancingLogEntry {
    id: number;
    triggered_by: string;
    total_drift_score: number;
    trades_count: number;
    estimated_tax: number;
    ai_summary: string;
    created_at: string;
}

interface RebalancingHistoryTableProps {
    portfolioId: string;
    logs?: RebalancingLogEntry[];
    isLoading?: boolean;
}

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateStr;
    }
}

function getTriggerBadge(trigger: string) {
    const map: Record<string, { label: string; color: string }> = {
        manual: { label: "Manual", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
        scheduled: { label: "Scheduled", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
        api_preview: { label: "Preview", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
        execution: { label: "Executed", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
        harvest_scan: { label: "Harvest", color: "text-green-400 bg-green-500/10 border-green-500/20" },
    };
    const badge = map[trigger] || { label: trigger, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
    return badge;
}

export default function RebalancingHistoryTable({
    portfolioId,
    logs = [],
    isLoading = false,
}: RebalancingHistoryTableProps) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/60 backdrop-blur-xl p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
                <span className="ml-3 text-sm text-slate-400 tracking-wider">
                    Loading history...
                </span>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/60 backdrop-blur-xl p-8 text-center">
                <History className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500 tracking-wider">
                    No rebalancing history yet
                </p>
                <p className="text-xs text-slate-600 mt-1">
                    Run your first rebalance to see results here
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/60 backdrop-blur-xl overflow-hidden shadow-lg shadow-cyan-500/5">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <History className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                            Rebalancing History
                        </h3>
                        <p className="text-xs text-slate-500">
                            {logs.length} past{" "}
                            {logs.length === 1 ? "run" : "runs"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1fr_100px_80px_70px_90px] gap-2 px-5 py-3 border-b border-slate-800/50 text-[10px] text-slate-500 tracking-widest uppercase">
                <span>Date</span>
                <span>Trigger</span>
                <span className="text-right">Drift</span>
                <span className="text-right">Trades</span>
                <span className="text-right">Tax (₹)</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-800/30">
                {logs.map((log) => {
                    const isExpanded = expandedId === log.id;
                    const badge = getTriggerBadge(log.triggered_by);
                    const driftColor =
                        log.total_drift_score <= 0.03
                            ? "text-emerald-400"
                            : log.total_drift_score <= 0.08
                            ? "text-amber-400"
                            : "text-red-400";

                    return (
                        <div key={log.id}>
                            <button
                                onClick={() =>
                                    setExpandedId(
                                        isExpanded ? null : log.id
                                    )
                                }
                                className="w-full grid grid-cols-[1fr_100px_80px_70px_90px] gap-2 px-5 py-3.5 items-center hover:bg-cyan-500/5 transition-colors text-left group"
                            >
                                <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-cyan-400 flex-shrink-0" />
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3 text-slate-600" />
                                        <span className="text-xs text-white truncate">
                                            {formatDate(log.created_at)}
                                        </span>
                                    </div>
                                </div>

                                <span
                                    className={`text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md border w-fit ${badge.color}`}
                                >
                                    {badge.label}
                                </span>

                                <span
                                    className={`text-xs font-bold text-right tabular-nums ${driftColor}`}
                                >
                                    {(log.total_drift_score * 100).toFixed(1)}%
                                </span>

                                <span className="text-xs font-bold text-right text-white tabular-nums">
                                    {log.trades_count}
                                </span>

                                <span className="text-xs font-bold text-right text-amber-400 tabular-nums">
                                    ₹
                                    {log.estimated_tax.toLocaleString("en-IN", {
                                        maximumFractionDigits: 0,
                                    })}
                                </span>
                            </button>

                            {/* Expanded AI Summary */}
                            {isExpanded && log.ai_summary && (
                                <div className="px-5 pb-4">
                                    <div className="ml-6 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                                            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
                                                AI Analysis
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            {log.ai_summary}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
