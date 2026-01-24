"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePortfolioStore, formatCurrency, Trade } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, RefreshCw, X, TrendingUp, TrendingDown } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface WizardProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RebalanceWizard({ isOpen, onClose }: WizardProps) {
    const { trades, generateRebalancingPlan, executeTrades, isRebalancing, metrics } = usePortfolioStore();
    const [step, setStep] = useState(1);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setCompleted(false);
            generateRebalancingPlan();
        }
    }, [isOpen, generateRebalancingPlan]);

    const handleExecute = async () => {
        setStep(2);
        const success = await executeTrades();
        
        if (success) {
            setStep(3);
            setCompleted(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#0ea5e9', '#d8b4fe', '#bbf7d0']
            });
        } else {
            setStep(1);
        }
    };

    const totalBuy = trades.filter(t => t.trade_type === "BUY").reduce((sum, t) => sum + t.trade_amount, 0);
    const totalSell = trades.filter(t => t.trade_type === "SELL").reduce((sum, t) => sum + t.trade_amount, 0);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            >
                <Card className="w-full max-w-2xl overflow-hidden shadow-2xl relative bg-white max-h-[90vh] overflow-y-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 z-10"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Portfolio Rebalancing</h2>
                        <p className="text-slate-500 mb-8">Optimize your holdings to match your target strategy.</p>

                        {step === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                {/* Summary Stats */}
                                {trades.length > 0 && (
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-green-700 mb-1">
                                                <TrendingUp className="h-4 w-4" />
                                                <span className="text-sm font-medium">Total to Buy</span>
                                            </div>
                                            <span className="text-xl font-bold text-green-800">
                                                {formatCurrency(totalBuy)}
                                            </span>
                                        </div>
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-red-700 mb-1">
                                                <TrendingDown className="h-4 w-4" />
                                                <span className="text-sm font-medium">Total to Sell</span>
                                            </div>
                                            <span className="text-xl font-bold text-red-800">
                                                {formatCurrency(totalSell)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
                                    <h3 className="font-semibold text-slate-800 mb-4">Proposed Trades</h3>
                                    {trades.length === 0 ? (
                                        <div className="text-center py-8">
                                            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                            <p className="text-slate-600 font-medium">Your portfolio is balanced!</p>
                                            <p className="text-slate-400 text-sm mt-1">No trades needed at this time.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {trades.map((trade, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded text-xs font-bold uppercase",
                                                            trade.trade_type === "BUY" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                        )}>
                                                            {trade.trade_type}
                                                        </span>
                                                        <div>
                                                            <span className="font-semibold text-slate-700">{trade.ticker}</span>
                                                            <p className="text-xs text-slate-400">{trade.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-mono font-medium">{formatCurrency(trade.trade_amount)}</span>
                                                        <p className="text-xs text-slate-400">
                                                            {trade.current_allocation.toFixed(1)}% → {trade.target_allocation.toFixed(1)}%
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                                    <Button onClick={handleExecute} disabled={trades.length === 0} className="px-8">
                                        Confirm & Execute <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12"
                            >
                                <div className="relative mb-6">
                                    <div className="h-16 w-16 rounded-full border-4 border-slate-100" />
                                    <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                                    <RefreshCw className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-2">Executing Trades...</h3>
                                <p className="text-slate-500">Updating your portfolio allocations.</p>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-8 text-center"
                            >
                                <div className="h-20 w-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-6">
                                    <CheckCircle2 className="h-10 w-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Rebalancing Complete!</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mb-8">
                                    Your portfolio has been successfully optimized. All trades have been executed.
                                </p>
                                <Button onClick={onClose} size="lg" className="px-10">
                                    Back to Dashboard
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
