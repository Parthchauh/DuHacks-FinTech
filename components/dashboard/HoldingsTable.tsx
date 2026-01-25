"use client";

/**
 * Holdings Table Component
 * =========================
 * Displays a table of portfolio holdings with CRUD operations.
 * Shows an elegant empty state SVG when no holdings exist.
 */

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Trash2, Plus, Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortfolioStore, formatCurrency } from "@/lib/store";
import { useState } from "react";
import { AddHoldingModal } from "./AddHoldingModal";
import { toast } from "sonner";

export function HoldingsTable() {
    const { holdings, removeHolding } = usePortfolioStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleDelete = async (holdingId: number, ticker: string) => {
        if (!confirm(`Are you sure you want to remove ${ticker} from your portfolio?`)) {
            return;
        }
        
        setDeletingId(holdingId);
        const success = await removeHolding(holdingId);
        if (success) {
            toast.success(`Removed ${ticker} from portfolio`);
        } else {
            toast.error("Failed to remove holding");
        }
        setDeletingId(null);
    };

    return (
        <>
            <AddHoldingModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            
            <Card className="overflow-hidden">
                {/* Header - responsive layout */}
                <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white/50">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900">Your Holdings</h3>
                        <p className="text-xs sm:text-sm text-slate-500">Manage your assets and targets</p>
                    </div>
                    {holdings.length > 0 && (
                        <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto min-h-[44px]">
                            <Plus className="mr-2 h-4 w-4" /> Add Holding
                        </Button>
                    )}
                </div>
                
                {holdings.length === 0 ? (
                    <div className="p-12 text-center">
                        {/* Empty State SVG Illustration */}
                        <div className="mx-auto w-40 h-40 mb-6 relative">
                            <svg viewBox="0 0 200 200" className="w-full h-full">
                                {/* Background Circle */}
                                <circle cx="100" cy="100" r="90" fill="#f8fafc" />
                                
                                {/* Briefcase outline */}
                                <rect x="50" y="70" width="100" height="70" rx="8" fill="#e2e8f0" />
                                <rect x="55" y="75" width="90" height="60" rx="6" fill="#f1f5f9" />
                                
                                {/* Briefcase handle */}
                                <path d="M75 70 V55 Q75 45 85 45 H115 Q125 45 125 55 V70" 
                                      fill="none" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round"/>
                                
                                {/* Plus sign */}
                                <line x1="100" y1="95" x2="100" y2="125" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round"/>
                                <line x1="85" y1="110" x2="115" y2="110" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round"/>
                                
                                {/* Decorative dots */}
                                <circle cx="35" cy="80" r="4" fill="#ddd6fe"/>
                                <circle cx="165" cy="120" r="5" fill="#bbf7d0"/>
                                <circle cx="45" cy="150" r="3" fill="#fcd34d"/>
                            </svg>
                        </div>
                        
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Holdings Yet</h3>
                        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                            Start building your investment portfolio by adding your first stock, ETF, or mutual fund
                        </p>
                        <Button onClick={() => setIsAddModalOpen(true)} size="lg">
                            <Plus className="mr-2 h-5 w-5" /> Add Your First Holding
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Asset</th>
                                    <th className="px-6 py-4 text-right">Price</th>
                                    <th className="px-6 py-4 text-right">Value</th>
                                    <th className="px-6 py-4 text-right">P&L</th>
                                    <th className="px-6 py-4 text-right">Actual %</th>
                                    <th className="px-6 py-4 text-right">Target %</th>
                                    <th className="px-6 py-4 text-right">Drift</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/30 backdrop-blur-sm">
                                {holdings.map((item) => {
                                    const actualAlloc = item.actual_allocation ?? 0;
                                    const targetAlloc = item.target_allocation ?? 0;
                                    const drift = actualAlloc - targetAlloc;
                                    const profitLossPercent = item.profit_loss_percent ?? 0;
                                    
                                    return (
                                        <tr key={item.id || item.ticker} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs",
                                                        profitLossPercent >= 0 ? "bg-green-500" : "bg-red-500"
                                                    )}>
                                                        {profitLossPercent >= 0 ? 
                                                            <TrendingUp className="h-4 w-4" /> : 
                                                            <TrendingDown className="h-4 w-4" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{item.ticker}</div>
                                                        <div className="text-xs text-slate-500 max-w-[150px] truncate">{item.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700">
                                                {formatCurrency(item.current_price || item.avg_buy_price)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-900">
                                                {formatCurrency(item.current_value || item.quantity * item.avg_buy_price)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn(
                                                    "font-medium",
                                                    profitLossPercent >= 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {profitLossPercent >= 0 ? "+" : ""}{profitLossPercent.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600">
                                                {actualAlloc.toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600">
                                                {targetAlloc.toFixed(1)}%
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
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="h-11 w-11 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 touch-manipulation"
                                                        onClick={() => item.id && handleDelete(item.id, item.ticker)}
                                                        disabled={deletingId === item.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </>
    );
}
