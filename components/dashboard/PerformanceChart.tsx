"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/Card";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

const data = [
    { date: "Jan", value: 1800000 },
    { date: "Feb", value: 1850000 },
    { date: "Mar", value: 1920000 },
    { date: "Apr", value: 1880000 },
    { date: "May", value: 2100000 },
    { date: "Jun", value: 2250000 },
    { date: "Jul", value: 2200000 },
    { date: "Aug", value: 2350000 },
    { date: "Sep", value: 2500000 },
];

export function PerformanceChart() {
    const [range, setRange] = useState("1Y");

    return (
        <Card className="h-[400px] flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-slate-900">Portfolio Performance</h3>
                    <p className="text-sm text-slate-500">Net worth over time</p>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                    {["1M", "3M", "6M", "1Y", "ALL"].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                                background: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(8px)'
                            }}
                            itemStyle={{ color: '#0ea5e9', fontWeight: 600 }}
                            formatter={(value: any) => [`₹${(value || 0).toLocaleString('en-IN')}`, "Net Worth"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#0ea5e9"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
