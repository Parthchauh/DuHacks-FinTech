"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortfolioStore } from "@/lib/store";

export function HoldingsTable() {
    const { holdings } = usePortfolioStore();

    return (
        <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50">
                <div>
                    <h3 className="font-semibold text-slate-900">Your Holdings</h3>
                    <p className="text-sm text-slate-500">Manage your assets and targets</p>
                </div>
                <Button size="sm" variant="outline">
                    <ArrowLeftRight className="mr-2 h-4 w-4" /> Import Holdings
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Asset</th>
                            <th className="px-6 py-4 text-right">Price</th>
                            <th className="px-6 py-4 text-right">Balance</th>
                            <th className="px-6 py-4 text-right">Actual %</th>
                            <th className="px-6 py-4 text-right">Target %</th>
                            <th className="px-6 py-4 text-right">Drift</th>
                            <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/30 backdrop-blur-sm">
                        {holdings.map((item) => {
                            const drift = item.allocation - item.target;
                            return (
                                <tr key={item.ticker} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900">{item.ticker}</div>
                                        <div className="text-xs text-slate-500">{item.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-700">
                                        ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                                        ${item.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        {item.allocation.toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        {item.target.toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={cn(
                                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                                            Math.abs(drift) < 1 ? "bg-slate-100 text-slate-600" :
                                                drift > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                                        )}>
                                            {drift > 0 ? "+" : ""}{drift.toFixed(1)}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {Math.abs(drift) >= 2 && (
                                            <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 h-8">
                                                Rebalance
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
