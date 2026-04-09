"use client";

/**
 * Transactions Page — Dark Vault Theme
 * =======================================
 * Dark table with search filter and empty state
 */

import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { Search, Receipt, ArrowUpRight, ArrowDownRight, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function TransactionsPage() {
    const router = useRouter();
    const { isAuthenticated, transactions, fetchTransactions, currentPortfolioId } = usePortfolioStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");

    useEffect(() => {
        if (!isAuthenticated) { router.push("/login"); return; }
        fetchTransactions();
    }, [isAuthenticated, router, fetchTransactions]);

    const filtered = (transactions || []).filter((tx) => {
        const matchesSearch =
            tx.ticker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.transaction_type?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType =
            typeFilter === "ALL" ||
            tx.transaction_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const handleExport = () => {
        if (currentPortfolioId) {
            api.exportExcel(currentPortfolioId);
        }
    };

    return (
        <motion.div
            className="space-y-8"
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        >
            {/* Header */}
            <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Transactions</h1>
                    <p className="text-slate-400 text-sm mt-1">View your trade history and portfolio activity.</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={!currentPortfolioId}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/20 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 bg-[#0d1320] transition-all text-sm font-medium disabled:opacity-40"
                >
                    <Download className="h-4 w-4" />
                    Export Excel
                </button>
            </motion.div>

            {/* Table Card */}
            <motion.div variants={item} className="rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 backdrop-blur-sm overflow-hidden">
                {/* Filters */}
                <div className="px-5 py-4 border-b border-cyan-500/10 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                        <input
                            type="text"
                            placeholder="Search by asset or type…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0a0e1a] border border-slate-700/50 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-white placeholder:text-slate-600 text-sm transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(["ALL", "BUY", "SELL"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={cn(
                                    "px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                                    typeFilter === t
                                        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                                        : "text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="mx-auto w-24 h-24 mb-5 flex items-center justify-center rounded-full bg-cyan-500/5 border border-cyan-500/15">
                            <Receipt className="h-10 w-10 text-cyan-500/40" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                            {searchQuery ? "No Results Found" : "No Transactions Yet"}
                        </h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto">
                            {searchQuery
                                ? "Try adjusting your search or filter terms."
                                : "Your trade history will appear here once you execute your first transaction."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-cyan-500/8 text-xs tracking-widest uppercase text-slate-500">
                                    <th className="px-6 py-3.5">Date</th>
                                    <th className="px-6 py-3.5">Type</th>
                                    <th className="px-6 py-3.5">Asset</th>
                                    <th className="px-6 py-3.5 text-right">Price</th>
                                    <th className="px-6 py-3.5 text-right">Qty</th>
                                    <th className="px-6 py-3.5 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cyan-500/5">
                                {filtered.map((tx) => {
                                    const isBuy = tx.transaction_type === "BUY" || tx.transaction_type === "DEPOSIT";
                                    return (
                                        <tr key={tx.id} className="hover:bg-cyan-500/3 transition-colors">
                                            <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                                                {new Date(tx.executed_at).toLocaleDateString("en-IN", {
                                                    year: "numeric", month: "short", day: "numeric",
                                                })}
                                                <span className="block text-slate-600">
                                                    {new Date(tx.executed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border",
                                                    isBuy
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : "bg-red-500/10 text-red-400 border-red-500/20"
                                                )}>
                                                    {isBuy ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                                    {tx.transaction_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-200">{tx.ticker}</td>
                                            <td className="px-6 py-4 text-right text-slate-400 font-mono text-xs">
                                                {formatCurrency(tx.price)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300 font-mono">
                                                {tx.quantity}
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 text-right font-bold font-mono",
                                                isBuy ? "text-slate-200" : "text-emerald-400"
                                            )}>
                                                {formatCurrency(tx.total_amount)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="px-6 py-3 border-t border-cyan-500/8 text-xs text-slate-600">
                            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} shown
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
