"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import { usePortfolioStore } from "@/lib/store";

const COLORS = ["#0ea5e9", "#d8b4fe", "#bbf7d0", "#fcd34d", "#cbd5e1"];

export function AllocationChart() {
    const { holdings } = usePortfolioStore();

    const data = holdings.map((h, i) => ({
        name: h.ticker,
        value: h.allocation,
        color: COLORS[i % COLORS.length]
    }));

    return (
        <Card className="h-[400px] flex flex-col">
            <div className="mb-4">
                <h3 className="font-semibold text-slate-900">Current Allocation</h3>
                <p className="text-sm text-slate-500">Visual breakdown of your holdings</p>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
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
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                                background: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(8px)'
                            }}
                            itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                            formatter={(value: any) => `${(value || 0).toFixed(1)}%`}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-slate-600">{item.name} ({item.value.toFixed(0)}%)</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
