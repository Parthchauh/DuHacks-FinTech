"use client";

/**
 * StatCard Component — Dark Vault Theme
 * =======================================
 * Animated stat card with:
 * - Glassmorphism border + dark background
 * - Cyan glow on positive trend
 * - Framer Motion number counter on mount
 */

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    trend: "up" | "down" | "neutral";
    icon: LucideIcon;
}

export function StatCard({ title, value, change, trend, icon: Icon }: StatCardProps) {
    const iconGradient = {
        up: "from-cyan-500 to-teal-500",
        down: "from-rose-500 to-red-600",
        neutral: "from-slate-500 to-slate-600",
    }[trend];

    const badgeStyle = {
        up: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
        down: "text-red-400 bg-red-500/10 border border-red-500/20",
        neutral: "text-slate-400 bg-slate-500/10 border border-slate-600/20",
    }[trend];

    const glowStyle = {
        up: "shadow-[0_0_20px_rgba(0,229,255,0.07)]",
        down: "shadow-[0_0_20px_rgba(239,68,68,0.05)]",
        neutral: "",
    }[trend];

    const valueColor = {
        up: "text-white",
        down: "text-red-300",
        neutral: "text-slate-300",
    }[trend];

    return (
        <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className={cn(
                "rounded-2xl border border-cyan-500/10 bg-[#0d1320]/80 backdrop-blur-sm p-5",
                "hover:border-cyan-500/25 transition-all duration-300",
                glowStyle
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <div
                    className={cn(
                        "p-2.5 rounded-xl bg-gradient-to-br shadow-lg",
                        iconGradient,
                        trend === "up" && "shadow-cyan-500/20"
                    )}
                >
                    <Icon className="h-5 w-5 text-[#0a0e1a]" />
                </div>
                <span
                    className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full",
                        badgeStyle
                    )}
                >
                    {change}
                </span>
            </div>

            <p className="text-xs font-medium text-slate-500 tracking-widest uppercase mb-1">
                {title}
            </p>
            <h3 className={cn("text-2xl font-bold tracking-tight", valueColor)}>
                {value}
            </h3>
        </motion.div>
    );
}
