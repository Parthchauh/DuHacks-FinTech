"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
    variant?: "primary" | "secondary" | "ghost" | "outline" | "glass";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
    children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {

        const variants = {
            primary: "bg-gradient-to-r from-primary to-blue-400 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 border border-transparent",
            secondary: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 border border-secondary/20",
            outline: "border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700",
            ghost: "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
            glass: "glass hover:bg-white/60 text-slate-800",
        };

        const sizes = {
            sm: "h-9 px-4 text-sms rounded-lg",
            md: "h-11 px-6 text-sm rounded-xl",
            lg: "h-14 px-8 text-base rounded-2xl",
            icon: "h-11 w-11 rounded-xl p-0 flex items-center justify-center",
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "inline-flex items-center justify-center font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {children}
            </motion.button>
        );
    }
);
Button.displayName = "Button";

export { Button };
