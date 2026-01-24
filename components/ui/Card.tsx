"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
    variant?: "default" | "glass" | "glass-card" | "flat";
    noHover?: boolean;
}

export function Card({ className, variant = "glass-card", noHover = false, children, ...props }: CardProps) {
    return (
        <motion.div
            whileHover={!noHover ? { y: -5 } : undefined}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn(
                "rounded-2xl p-6 transition-all duration-300",
                variant === "glass" && "glass",
                variant === "glass-card" && "glass-card",
                variant === "default" && "bg-white border border-slate-100 shadow-lg shadow-slate-200/50",
                variant === "flat" && "bg-slate-50 border border-slate-100",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
}
