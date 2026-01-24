"use client";

import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Mock transaction data
const transactions = [
    { id: 1, date: "2024-05-20", type: "BUY", asset: "NIFTYBEES", amount: 15000, price: 245.50, status: "Completed" },
    { id: 2, date: "2024-05-20", type: "BUY", asset: "RELIANCE", amount: 24500, price: 2910.00, status: "Completed" },
    { id: 3, date: "2024-05-18", type: "SELL", asset: "GOLDBEES", amount: 8400, price: 57.80, status: "Completed" },
    { id: 4, date: "2024-05-15", type: "DEPOSIT", asset: "INR", amount: 50000, price: 1.00, status: "Completed" },
    { id: 5, date: "2024-05-10", type: "BUY", asset: "JUNIORBEES", amount: 12000, price: 535.00, status: "Completed" },
    { id: 6, date: "2024-05-01", type: "DIVIDEND", asset: "NIFTYBEES", amount: 450, price: 1.00, status: "Completed" },
];

export default function TransactionsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
                <p className="text-slate-500">View your trade history and portfolio activity.</p>
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64"
                        />
                    </div>
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Asset</th>
                                <th className="px-6 py-4 text-right">Price</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/30 backdrop-blur-sm">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-600">{tx.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === 'BUY' || tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-800' :
                                                tx.type === 'SELL' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                            }`}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{tx.asset}</td>
                                    <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(tx.price)}</td>
                                    <td className={`px-6 py-4 text-right font-medium ${tx.type === 'BUY' ? 'text-slate-900' : 'text-green-600'
                                        }`}>
                                        {tx.type === 'BUY' ? '-' : '+'}{formatCurrency(tx.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-slate-500">{tx.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
