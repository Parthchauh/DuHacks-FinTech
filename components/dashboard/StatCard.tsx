"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'neutral';
    icon: LucideIcon;
}

export function StatCard({ title, value, change, trend, icon: Icon }: StatCardProps) {
    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="bg-slate-50 p-3 rounded-xl">
                    <Icon className="h-6 w-6 text-slate-600" />
                </div>
                <div className={cn(
                    "text-sm font-semibold px-2 py-1 rounded-full",
                    trend === 'up' ? "bg-green-50 text-green-700" :
                        trend === 'down' ? "bg-red-50 text-red-700" :
                            "bg-slate-100 text-slate-600"
                )}>
                    {change}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            </div>
        </Card>
    );
}
