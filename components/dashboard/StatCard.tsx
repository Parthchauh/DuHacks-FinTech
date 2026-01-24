"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string;
    change?: string;
    trend?: "up" | "down" | "neutral";
    icon?: React.ElementType;
    className?: string;
}

export function StatCard({ title, value, change, trend, icon: Icon, className }: StatCardProps) {
    return (
        <Card className={cn("flex flex-col gap-4", className)}>
            <div className="flex justify-between items-start">
                <div className="p-3 bg-primary/5 rounded-xl">
                    {Icon && <Icon className="h-5 w-5 text-primary" />}
                </div>
                {change && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                        trend === "up" && "bg-green-50 text-green-600",
                        trend === "down" && "bg-red-50 text-red-600",
                        trend === "neutral" && "bg-slate-50 text-slate-600"
                    )}>
                        {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                        {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
                        {change}
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
        </Card>
    );
}
