"use client";

/**
 * TradeExecutionFlow — Step-through trade execution UI
 * =====================================================
 * Modal/drawer showing all proposed trades with:
 *  - Review → Confirm → Execute → Status flow
 *  - Tax impact summary per trade
 *  - Total cost breakdown
 *  - Groww/Smallcase order routing
 */

import { useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    BadgeAlert,
    CheckCircle2,
    CreditCard,
    Loader2,
    ShieldCheck,
    X,
    Zap,
} from "lucide-react";

interface Trade {
    symbol: string;
    action: "BUY" | "SELL";
    quantity: number;
    estimated_value: number;
    current_price: number;
    target_weight_after: number;
    reason: string;
    priority: number;
    tax_impact?: {
        tax_liability: number;
        stt_cost: number;
        gain_type: string;
    };
}

interface TradeExecutionFlowProps {
    trades: Trade[];
    portfolioValue: number;
    onExecute: (tradeIndices: number[]) => Promise<void>;
    onClose: () => void;
    isOpen: boolean;
}

type FlowStep = "review" | "confirm" | "executing" | "complete";

export default function TradeExecutionFlow({
    trades,
    portfolioValue,
    onExecute,
    onClose,
    isOpen,
}: TradeExecutionFlowProps) {
    const [step, setStep] = useState<FlowStep>("review");
    const [selectedTrades, setSelectedTrades] = useState<number[]>(
        trades.map((_, i) => i)
    );
    const [progress, setProgress] = useState(0);

    if (!isOpen) return null;

    const buyTrades = trades.filter(
        (t, i) => t.action === "BUY" && selectedTrades.includes(i)
    );
    const sellTrades = trades.filter(
        (t, i) => t.action === "SELL" && selectedTrades.includes(i)
    );
    const totalBuy = buyTrades.reduce((s, t) => s + t.estimated_value, 0);
    const totalSell = sellTrades.reduce((s, t) => s + t.estimated_value, 0);
    const totalTax = trades
        .filter((_, i) => selectedTrades.includes(i))
        .reduce(
            (s, t) =>
                s + (t.tax_impact?.tax_liability || 0) + (t.tax_impact?.stt_cost || 0),
            0
        );

    const toggleTrade = (idx: number) => {
        setSelectedTrades((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
        );
    };

    const handleExecute = async () => {
        setStep("executing");
        setProgress(0);

        // Simulate progress
        const interval = setInterval(() => {
            setProgress((p) => {
                if (p >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return p + 5;
            });
        }, 100);

        try {
            await onExecute(selectedTrades);
            clearInterval(interval);
            setProgress(100);
            setStep("complete");
        } catch {
            clearInterval(interval);
            setStep("review");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#0a0e1a]/90 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-cyan-500/15 bg-[#0d1320] shadow-2xl shadow-cyan-500/10">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-800/50 bg-[#0d1320]/95 backdrop-blur-sm">
                    <div>
                        <h2 className="text-lg font-bold tracking-wider text-white uppercase">
                            {step === "review" && "Review Trades"}
                            {step === "confirm" && "Confirm Execution"}
                            {step === "executing" && "Executing..."}
                            {step === "complete" && "Order Submitted"}
                        </h2>
                        <p className="text-xs text-slate-500 tracking-wider mt-0.5">
                            {selectedTrades.length} of {trades.length} trades
                            selected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* ── REVIEW STEP ─────────────────────────── */}
                    {step === "review" && (
                        <>
                            {trades.map((trade, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => toggleTrade(idx)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        selectedTrades.includes(idx)
                                            ? "border-cyan-500/30 bg-cyan-500/5"
                                            : "border-slate-700/30 bg-[#0a0e1a] opacity-50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`p-1.5 rounded-lg ${
                                                    trade.action === "BUY"
                                                        ? "bg-cyan-500/10"
                                                        : "bg-amber-500/10"
                                                }`}
                                            >
                                                {trade.action === "BUY" ? (
                                                    <ArrowUp className="h-3.5 w-3.5 text-cyan-400" />
                                                ) : (
                                                    <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-white">
                                                    {trade.symbol}
                                                </span>
                                                <span
                                                    className={`ml-2 text-xs font-semibold tracking-wider ${
                                                        trade.action === "BUY"
                                                            ? "text-cyan-400"
                                                            : "text-amber-400"
                                                    }`}
                                                >
                                                    {trade.action}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white tabular-nums">
                                                ₹
                                                {trade.estimated_value.toLocaleString(
                                                    "en-IN",
                                                    { maximumFractionDigits: 0 }
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                {trade.quantity} shares @
                                                ₹{trade.current_price.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tax row */}
                                    {trade.tax_impact && trade.action === "SELL" && (
                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
                                            <BadgeAlert className="h-3 w-3 text-amber-500" />
                                            <span className="text-[10px] text-amber-400 tracking-wider">
                                                {trade.tax_impact.gain_type} Tax:
                                                ₹
                                                {trade.tax_impact.tax_liability.toLocaleString(
                                                    "en-IN"
                                                )}{" "}
                                                + STT ₹
                                                {trade.tax_impact.stt_cost.toLocaleString(
                                                    "en-IN"
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    {trade.priority === 1 && (
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <Zap className="h-3 w-3 text-red-400" />
                                            <span className="text-[10px] text-red-400 tracking-wider uppercase">
                                                Urgent
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Summary bar */}
                            <div className="p-4 rounded-xl bg-[#0a0e1a] border border-slate-700/30 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 tracking-wider">
                                        Total Buy
                                    </span>
                                    <span className="text-cyan-400 font-bold tabular-nums">
                                        ₹{totalBuy.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 tracking-wider">
                                        Total Sell
                                    </span>
                                    <span className="text-amber-400 font-bold tabular-nums">
                                        ₹{totalSell.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs pt-2 border-t border-slate-800/50">
                                    <span className="text-slate-500 tracking-wider">
                                        Est. Tax + STT
                                    </span>
                                    <span className="text-red-400 font-bold tabular-nums">
                                        ₹{totalTax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep("confirm")}
                                disabled={selectedTrades.length === 0}
                                className="w-full py-3.5 text-xs font-bold tracking-[0.25em] uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40"
                            >
                                Proceed to Confirm
                            </button>
                        </>
                    )}

                    {/* ── CONFIRM STEP ────────────────────────── */}
                    {step === "confirm" && (
                        <div className="text-center space-y-6 py-4">
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 inline-block">
                                <ShieldCheck className="h-12 w-12 text-amber-400 mx-auto" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    Confirm {selectedTrades.length} Trades
                                </h3>
                                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                    Orders will be placed via your connected
                                    broker. This action is irreversible during
                                    market hours.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-[#0a0e1a] border border-slate-700/30">
                                    <p className="text-[10px] text-slate-500 tracking-wider uppercase mb-1">
                                        Net Flow
                                    </p>
                                    <p className={`text-lg font-bold tabular-nums ${totalSell >= totalBuy ? "text-emerald-400" : "text-red-400"}`}>
                                        {totalSell >= totalBuy ? "+" : "-"}₹
                                        {Math.abs(totalSell - totalBuy).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0a0e1a] border border-slate-700/30">
                                    <p className="text-[10px] text-slate-500 tracking-wider uppercase mb-1">
                                        Tax Drag
                                    </p>
                                    <p className="text-lg font-bold text-amber-400 tabular-nums">
                                        ₹{totalTax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setStep("review")}
                                    className="flex-1 py-3 rounded-xl border border-slate-700/50 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-all text-xs font-semibold tracking-wider uppercase"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleExecute}
                                    className="flex-1 py-3 text-xs font-bold tracking-[0.2em] uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Execute Now
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── EXECUTING STEP ──────────────────────── */}
                    {step === "executing" && (
                        <div className="text-center space-y-6 py-8">
                            <Loader2 className="h-12 w-12 text-cyan-400 animate-spin mx-auto" />
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    Placing Orders...
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Routing to broker via Groww Gateway
                                </p>
                            </div>
                            <div className="max-w-xs mx-auto">
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-200"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2 tabular-nums">
                                    {progress}%
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── COMPLETE STEP ───────────────────────── */}
                    {step === "complete" && (
                        <div className="text-center space-y-6 py-8">
                            <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-block">
                                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    Orders Submitted!
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {selectedTrades.length} trades sent to
                                    broker. Settlement: T+1.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 text-xs font-bold tracking-[0.25em] uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0a0e1a] shadow-lg shadow-cyan-500/20"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
