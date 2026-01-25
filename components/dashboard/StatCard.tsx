"use client";

/**
 * StatCard Component
 * ==================
 * Adaptive stat card with responsive sizing based on:
 * - Screen size: mobile < tablet < desktop
 * - Value presence: no values = compact, with values = standard
 * Premium design with vibrant gradients and smooth animations.
 */

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    trend: string;  // 'up' | 'down' | 'neutral'
    icon: LucideIcon;
}

export function StatCard({ title, value, change, trend, icon: Icon }: StatCardProps) {
    // Check if this is an empty/no-value state
    const hasValue = value !== "₹0" && value !== "N/A" && value !== "0.0%" && value !== "0";
    
    // Gradient backgrounds based on trend
    const gradients = {
        up: "from-emerald-500 to-green-600",
        down: "from-rose-500 to-red-600",
        neutral: "from-slate-400 to-slate-500"
    };

    const badgeStyles = {
        up: "bg-emerald-50 text-emerald-700 border-emerald-100",
        down: "bg-rose-50 text-rose-700 border-rose-100",
        neutral: "bg-slate-50 text-slate-600 border-slate-100"
    };

    const gradient = gradients[trend as keyof typeof gradients] || gradients.neutral;
    const badgeStyle = badgeStyles[trend as keyof typeof badgeStyles] || badgeStyles.neutral;

    return (
        <Card className={cn(
            "hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group",
            // Adaptive padding: smaller on mobile, especially for empty states
            hasValue 
                ? "p-4 sm:p-5 lg:p-6" 
                : "p-3 sm:p-4 lg:p-5"
        )}>
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                {/* Adaptive icon sizing */}
                <div className={cn(
                    "rounded-lg sm:rounded-xl bg-gradient-to-br shadow-md sm:shadow-lg transition-transform duration-300 group-hover:scale-105",
                    gradient,
                    hasValue 
                        ? "p-2 sm:p-2.5 lg:p-3" 
                        : "p-1.5 sm:p-2 lg:p-2.5"
                )}>
                    <Icon className={cn(
                        "text-white",
                        hasValue 
                            ? "h-4 w-4 sm:h-4.5 sm:w-4.5 lg:h-5 lg:w-5" 
                            : "h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-4 lg:w-4"
                    )} />
                </div>
                
                {/* Adaptive badge */}
                <div className={cn(
                    "font-semibold rounded-full border transition-colors",
                    badgeStyle,
                    hasValue 
                        ? "text-xs px-2.5 py-1 sm:px-3 sm:py-1.5" 
                        : "text-[10px] px-2 py-0.5 sm:text-xs sm:px-2.5 sm:py-1"
                )}>
                    {change}
                </div>
            </div>
            
            <div>
                {/* Adaptive title */}
                <p className={cn(
                    "font-medium text-slate-500",
                    hasValue 
                        ? "text-xs sm:text-sm mb-0.5 sm:mb-1" 
                        : "text-[10px] sm:text-xs mb-0.5"
                )}>
                    {title}
                </p>
                
                {/* Adaptive value */}
                <h3 className={cn(
                    "font-bold text-slate-900 tracking-tight",
                    hasValue 
                        ? "text-lg sm:text-xl lg:text-2xl" 
                        : "text-base sm:text-lg lg:text-xl"
                )}>
                    {value}
                </h3>
            </div>
        </Card>
    );
}
