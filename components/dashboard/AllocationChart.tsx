"use client";

/**
 * Allocation Chart Component
 * ==========================
 * Displays a donut chart showing portfolio allocation breakdown.
 * Shows an empty state SVG when no holdings exist.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import { usePortfolioStore } from "@/lib/store";
import { PieChart as PieChartIcon } from "lucide-react";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

export function AllocationChart() {
    const { holdings } = usePortfolioStore();

    // Filter holdings with valid allocation data
    const validHoldings = holdings.filter(h => 
        h && typeof h.actual_allocation === 'number' && h.actual_allocation > 0
    );

    const data = validHoldings.map((h, i) => ({
        name: h.ticker || 'Unknown',
        value: h.actual_allocation || 0,
        color: COLORS[i % COLORS.length]
    }));

    // Empty state when no holdings
    if (data.length === 0) {
        return (
            <Card className="min-h-[300px] sm:h-[400px] flex flex-col p-4 sm:p-6">
                <div className="mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">Current Allocation</h3>
                    <p className="text-xs sm:text-sm text-slate-500">Visual breakdown of your holdings</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    {/* Empty State SVG */}
                    <div className="w-32 h-32 mb-6 relative">
                        <svg viewBox="0 0 200 200" className="w-full h-full">
                            {/* Outer ring */}
                            <circle 
                                cx="100" cy="100" r="80" 
                                fill="none" 
                                stroke="#e2e8f0" 
                                strokeWidth="20"
                                strokeDasharray="251.2 251.2"
                            />
                            {/* Dotted sections to suggest pie slices */}
                            <circle 
                                cx="100" cy="100" r="80" 
                                fill="none" 
                                stroke="#cbd5e1" 
                                strokeWidth="20"
                                strokeDasharray="50 200"
                                transform="rotate(-90 100 100)"
                            />
                            <circle 
                                cx="100" cy="100" r="80" 
                                fill="none" 
                                stroke="#94a3b8" 
                                strokeWidth="20"
                                strokeDasharray="80 200"
                                strokeDashoffset="-80"
                                transform="rotate(-90 100 100)"
                            />
                            {/* Center icon */}
                            <circle cx="100" cy="100" r="40" fill="#f8fafc" />
                            <g transform="translate(82, 82)">
                                <PieChartIcon className="w-9 h-9 text-slate-300" />
                            </g>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <PieChartIcon className="w-10 h-10 text-slate-300" />
                        </div>
                    </div>
                    <h4 className="text-lg font-medium text-slate-700 mb-2">No Holdings Yet</h4>
                    <p className="text-sm text-slate-500 max-w-xs">
                        Add your first investment to see your portfolio allocation visualized here
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="min-h-[300px] sm:h-[400px] flex flex-col p-4 sm:p-6">
            <div className="mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Current Allocation</h3>
                <p className="text-xs sm:text-sm text-slate-500">Visual breakdown of your holdings</p>
            </div>
            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(8px)'
                            }}
                            itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                            formatter={(value: number) => `${(value ?? 0).toFixed(1)}%`}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }} 
                        />
                        <span className="text-sm text-slate-600">
                            {item.name} ({(item.value ?? 0).toFixed(0)}%)
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
