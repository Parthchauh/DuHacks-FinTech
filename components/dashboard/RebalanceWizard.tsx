"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePortfolioStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";
import confetti from "canvas-confetti";
import { cn, formatCurrency } from "@/lib/utils";

interface WizardProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RebalanceWizard({ isOpen, onClose }: WizardProps) {
    const { trades, generateRebalancingPlan, executeTrades, isRebalancing } = usePortfolioStore();
    const [step, setStep] = useState(1);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setCompleted(false);
            generateRebalancingPlan();
        }
    }, [isOpen, generateRebalancingPlan]);

    const handleExecute = () => {
        setStep(2);
        executeTrades();
        setTimeout(() => {
            setStep(3);
            setCompleted(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#0ea5e9', '#d8b4fe', '#bbf7d0']
            });
        }, 2000); // Sync with store's mock delay
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            >
                <Card className="w-full max-w-2xl overflow-hidden shadow-2xl relative bg-white">
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
                                <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
                                    <h3 className="font-semibold text-slate-800 mb-4">Proposed Trades</h3>
                                    {trades.length === 0 ? (
                                        <p className="text-slate-500 italic">No trades needed. Your portfolio is balanced!</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {trades.map((trade, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded text-xs font-bold uppercase",
                                                            trade.type === "BUY" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                        )}>
                                                            {trade.type}
                                                        </span>
                                                        <span className="font-semibold text-slate-700">{trade.ticker}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-mono font-medium">{formatCurrency(trade.amount)}</span>
                                                        <p className="text-xs text-slate-400">{trade.reason}</p>
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
                                <p className="text-slate-500">Connecting to exchange and placing orders.</p>
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
                                    Your portfolio has been successfully optimized. All trades have been settled.
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
