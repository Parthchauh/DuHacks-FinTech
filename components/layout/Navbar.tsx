"use client";

import Link from "next/link";
import { Button } from "../ui/Button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { TrendingUp } from "lucide-react";

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 20);
    });

    return (
        <motion.header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-4 lg:p-6 transition-all duration-300",
            )}
        >
            <div
                className={cn(
                    "flex items-center justify-between w-full max-w-7xl rounded-2xl px-6 py-4 transition-all duration-500", // Increased padding
                    isScrolled
                        ? "glass-card shadow-xl shadow-primary/5 py-4"
                        : "bg-transparent py-6" // More spacious
                )}
            >
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-primary transition-colors">
                        OptiWealth
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
                    <Link href="#" className="hover:text-primary transition-colors">Solutions</Link>
                    <Link href="#" className="hover:text-primary transition-colors">Pricing</Link>
                    <Link href="#" className="hover:text-primary transition-colors">Resources</Link>
                </nav>

                <div className="flex items-center gap-4">
                    <Link href="/login">
                        <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                            Sign In
                        </Button>
                    </Link>
                    <Link href="/register">
                        <Button variant="primary" size="sm" className="shadow-lg shadow-primary/20 rounded-full px-6">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.header>
    );
}
