"use client";

/**
 * Holdings Table — Dark Vault Theme
 * ====================================
 * Dark glassmorphism table with:
 * - Cyan ticker links that open ChartModal
 * - Green/red glow flash on live price updates
 * - MiniChart sparklines per row
 * - Sticky header with backdrop blur
 * - Empty state with dark vault styling
 */

import { Button } from "@/components/ui/Button";
import {
    Trash2,
    Plus,
    TrendingUp,
    TrendingDown,
    BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { useState, useEffect, useRef } from "react";
import { AddHoldingModal } from "./AddHoldingModal";
import { MiniChart } from "@/components/charts/MiniChart";
import { toast } from "sonner";

export function HoldingsTable() {
    const { holdings, removeHolding, prices, setChartSymbol } =
        usePortfolioStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Track previous prices for flash animation
    const prevPricesRef = useRef<Record<string, number>>({});
    const [flashMap, setFlashMap] = useState<
        Record<string, "up" | "down" | null>
    >({});

    useEffect(() => {
        const flashes: Record<string, "up" | "down" | null> = {};
        for (const [sym, price] of Object.entries(prices)) {
            const prev = prevPricesRef.current[sym];
            if (prev !== undefined && prev !== price) {
                flashes[sym] = price > prev ? "up" : "down";
            }
        }
        if (Object.keys(flashes).length > 0) {
            setFlashMap((prev) => ({ ...prev, ...flashes }));
            const timer = setTimeout(() => {
                setFlashMap((prev) => {
                    const next = { ...prev };
                    for (const sym of Object.keys(flashes)) next[sym] = null;
                    return next;
                });
            }, 700);
            return () => clearTimeout(timer);
        }
        prevPricesRef.current = { ...prices };
    }, [prices]);

    const handleDelete = async (holdingId: number, ticker: string) => {
        if (
            !confirm(
                `Remove ${ticker} from your portfolio?`
            )
        )
            return;
        setDeletingId(holdingId);
        const success = await removeHolding(holdingId);
        if (success) toast.success(`Removed ${ticker} from portfolio`);
        else toast.error("Failed to remove holding");
        setDeletingId(null);
    };

    return (
        <>
            <AddHoldingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <div className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 backdrop-blur-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-cyan-500/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sticky top-0 bg-[#0d1320]/95 backdrop-blur-xl z-10">
                    <div>
                        <h3 className="text-base font-semibold text-white">
                            Your Holdings
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage your assets and targets
                        </p>
                    </div>
                    {holdings.length > 0 && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 w-full sm:w-auto justify-center"
                        >
                            <Plus className="h-4 w-4" /> Add Holding
                        </button>
                    )}
                </div>

                {holdings.length === 0 ? (
                    /* Empty State */
                    <div className="p-12 text-center">
                        <div className="mx-auto w-36 h-36 mb-6 relative">
                            <svg viewBox="0 0 200 200" className="w-full h-full">
                                <circle
                                    cx="100"
                                    cy="100"
                                    r="90"
                                    fill="rgba(6,182,212,0.04)"
                                />
                                <circle
                                    cx="100"
                                    cy="100"
                                    r="90"
                                    fill="none"
                                    stroke="rgba(6,182,212,0.15)"
                                    strokeWidth="1"
                                />
                                <rect
                                    x="50"
                                    y="70"
                                    width="100"
                                    height="70"
                                    rx="8"
                                    fill="rgba(6,182,212,0.08)"
                                    stroke="rgba(6,182,212,0.2)"
                                    strokeWidth="1"
                                />
                                <path
                                    d="M75 70 V55 Q75 45 85 45 H115 Q125 45 125 55 V70"
                                    fill="none"
                                    stroke="rgba(6,182,212,0.3)"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1="100"
                                    y1="93"
                                    x2="100"
                                    y2="117"
                                    stroke="rgba(0,229,255,0.6)"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1="88"
                                    y1="105"
                                    x2="112"
                                    y2="105"
                                    stroke="rgba(0,229,255,0.6)"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                />
                                <circle
                                    cx="35"
                                    cy="80"
                                    r="4"
                                    fill="rgba(6,182,212,0.4)"
                                />
                                <circle
                                    cx="165"
                                    cy="120"
                                    r="5"
                                    fill="rgba(20,184,166,0.4)"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            No Holdings Yet
                        </h3>
                        <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">
                            Start building your portfolio by adding your first
                            stock, ETF, or mutual fund.
                        </p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/25"
                        >
                            <Plus className="h-5 w-5" /> Add Your First Holding
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-cyan-500/10 text-xs tracking-widest uppercase text-slate-500">
                                    <th className="px-5 py-3.5">Asset</th>
                                    <th className="px-4 py-3.5 text-right">
                                        Price
                                    </th>
                                    <th className="px-3 py-3.5 text-center">
                                        Trend
                                    </th>
                                    <th className="px-4 py-3.5 text-right">
                                        Value
                                    </th>
                                    <th className="px-4 py-3.5 text-right">
                                        P&L
                                    </th>
                                    <th className="px-4 py-3.5 text-right">
                                        Actual
                                    </th>
                                    <th className="px-4 py-3.5 text-right">
                                        Target
                                    </th>
                                    <th className="px-4 py-3.5 text-right">
                                        Drift
                                    </th>
                                    <th className="px-4 py-3.5 text-center">
                                        Del
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cyan-500/5">
                                {holdings.map((holding) => {
                                    const actualAlloc =
                                        holding.actual_allocation ?? 0;
                                    const targetAlloc =
                                        holding.target_allocation ?? 0;
                                    const drift = actualAlloc - targetAlloc;
                                    const plPct =
                                        holding.profit_loss_percent ?? 0;
                                    const livePrice =
                                        prices[holding.ticker] ??
                                        holding.current_price ??
                                        holding.avg_buy_price;
                                    const flash = flashMap[holding.ticker];

                                    return (
                                        <tr
                                            key={
                                                holding.id || holding.ticker
                                            }
                                            className="hover:bg-cyan-500/3 transition-colors group"
                                        >
                                            {/* Asset */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center text-[#0a0e1a]",
                                                            plPct >= 0
                                                                ? "bg-gradient-to-br from-cyan-400 to-teal-500"
                                                                : "bg-gradient-to-br from-rose-400 to-red-500"
                                                        )}
                                                    >
                                                        {plPct >= 0 ? (
                                                            <TrendingUp className="h-4 w-4" />
                                                        ) : (
                                                            <TrendingDown className="h-4 w-4" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <button
                                                            onClick={() =>
                                                                setChartSymbol(
                                                                    holding.ticker
                                                                )
                                                            }
                                                            className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 group-hover:underline underline-offset-2"
                                                        >
                                                            {holding.ticker}
                                                            <BarChart3 className="h-3 w-3 opacity-40" />
                                                        </button>
                                                        <div className="text-xs text-slate-500 max-w-[140px] truncate">
                                                            {holding.name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Live Price */}
                                            <td className="px-4 py-4 text-right">
                                                <span
                                                    className={cn(
                                                        "font-medium tabular-nums px-2 py-0.5 rounded-lg transition-all duration-500",
                                                        flash === "up" &&
                                                            "bg-emerald-500/15 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]",
                                                        flash === "down" &&
                                                            "bg-red-500/15 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]",
                                                        !flash && "text-slate-200"
                                                    )}
                                                >
                                                    {formatCurrency(livePrice)}
                                                </span>
                                            </td>

                                            {/* MiniChart Sparkline */}
                                            <td className="px-3 py-4">
                                                <div className="flex justify-center">
                                                    <MiniChart
                                                        symbol={holding.ticker}
                                                        currentPrice={livePrice}
                                                        width={90}
                                                        height={30}
                                                        onClick={() =>
                                                            setChartSymbol(
                                                                holding.ticker
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-right font-medium text-slate-200">
                                                {formatCurrency(
                                                    holding.current_value ||
                                                        holding.quantity *
                                                            holding.avg_buy_price
                                                )}
                                            </td>

                                            <td className="px-4 py-4 text-right">
                                                <span
                                                    className={cn(
                                                        "font-medium text-sm",
                                                        plPct >= 0
                                                            ? "text-emerald-400"
                                                            : "text-red-400"
                                                    )}
                                                >
                                                    {plPct >= 0 ? "+" : ""}
                                                    {plPct.toFixed(1)}%
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-right text-slate-400 text-sm">
                                                {actualAlloc.toFixed(1)}%
                                            </td>
                                            <td className="px-4 py-4 text-right text-slate-400 text-sm">
                                                {targetAlloc.toFixed(1)}%
                                            </td>

                                            <td className="px-4 py-4 text-right">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                                                        Math.abs(drift) < 1
                                                            ? "bg-slate-700/50 text-slate-400"
                                                            : drift > 0
                                                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                    )}
                                                >
                                                    {drift > 0 ? "+" : ""}
                                                    {drift.toFixed(1)}%
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 w-9 p-0 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                    onClick={() =>
                                                        holding.id &&
                                                        handleDelete(
                                                            holding.id,
                                                            holding.ticker
                                                        )
                                                    }
                                                    disabled={
                                                        deletingId === holding.id
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
