"use client";

/**
 * Transactions Page
 * ==================
 * Shows real transaction history from API or empty state if no transactions.
 */

import { Card } from "@/components/ui/Card";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { Search, Filter, Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TransactionsPage() {
    const router = useRouter();
    const { isAuthenticated, transactions, fetchTransactions } = usePortfolioStore();
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        } else {
            fetchTransactions();
        }
    }, [isAuthenticated, router, fetchTransactions]);

    // Filter transactions based on search
    const filteredTransactions = transactions?.filter(tx => 
        tx.ticker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.transaction_type?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
                <p className="text-slate-500">View your trade history and portfolio activity.</p>
            </div>

            <Card className="overflow-hidden border-slate-200">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by asset or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-72 shadow-sm"
                        />
                    </div>
                    {/* <Button variant="outline" size="sm" className="hidden sm:flex">
                        <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button> */}
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="p-16 text-center">
                        {/* Empty State SVG */}
                        <div className="mx-auto w-32 h-32 mb-6 opacity-80">
                            <div className="relative w-full h-full">
                                <div className="absolute inset-0 bg-slate-100 rounded-full animate-pulse opacity-50"></div>
                                <svg viewBox="0 0 200 200" className="w-full h-full relative z-10">
                                    <path d="M60,40 L140,40 L140,160 L60,160 z" fill="#fff" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
                                    <line x1="75" y1="60" x2="125" y2="60" stroke="#cbd5e1" strokeWidth="4" />
                                    <line x1="75" y1="80" x2="115" y2="80" stroke="#cbd5e1" strokeWidth="4" />
                                    <line x1="75" y1="100" x2="125" y2="100" stroke="#cbd5e1" strokeWidth="4" />
                                    <circle cx="140" cy="140" r="30" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                                    <path d="M125,140 L155,140" stroke="#94a3b8" strokeWidth="2" />
                                    <path d="M140,125 L140,155" stroke="#94a3b8" strokeWidth="2" />
                                </svg>
                            </div>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">No Transactions Found</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            {searchQuery ? "Try adjusting your search terms." : "Your transaction history will appear here once you make your first trade."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Asset</th>
                                    <th className="px-6 py-4 text-right">Price</th>
                                    <th className="px-6 py-4 text-right">Quantity</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(tx.executed_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                tx.transaction_type === 'BUY' || tx.transaction_type === 'DEPOSIT' ? 'bg-green-100 text-green-700' :
                                                tx.transaction_type === 'SELL' || tx.transaction_type === 'WITHDRAWAL' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {tx.transaction_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-900">{tx.ticker}</td>
                                        <td className="px-6 py-4 text-right text-slate-600 font-mono">
                                            {formatCurrency(tx.price)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-900 font-mono">
                                            {tx.quantity}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold font-mono ${
                                            tx.transaction_type === 'BUY' ? 'text-slate-900' : 
                                            tx.transaction_type === 'SELL' ? 'text-green-600' : 'text-slate-900'
                                        }`}>
                                            {formatCurrency(tx.total_amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
