"use client";

/**
 * Dashboard Layout — Dark Vault Theme
 * =====================================
 * Wraps all dashboard pages with:
 * - Dark vault background (#0a0e1a)
 * - Sidebar navigation
 * - Live price alert notifications
 * - Auth guard (redirects to /login if unauthenticated)
 * - Smooth loading spinner on initial auth check
 */

import { Sidebar } from "@/components/layout/Sidebar";
import { PriceAlertNotification } from "@/components/dashboard/PriceAlertNotification";
import { usePortfolioStore } from "@/lib/store";
import { useLivePrices } from "@/hooks/useLivePrices";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isAuthenticated = usePortfolioStore((state) => state.isAuthenticated);
    const fetchPortfolios = usePortfolioStore((state) => state.fetchPortfolios);
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Auto-poll live prices every 30s for all current holdings
    useLivePrices({ paused: !isAuthorized });

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        } else {
            setIsAuthorized(true);
            fetchPortfolios();
        }
    }, [isAuthenticated, router, fetchPortfolios]);

    if (!isAuthorized) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0e1a]">
                {/* Animated background blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px]" />
                </div>
                <div className="relative z-10 flex flex-col items-center gap-5">
                    <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl shadow-lg shadow-cyan-500/25">
                        <TrendingUp className="h-8 w-8 text-[#0a0e1a]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <p className="text-slate-500 text-xs tracking-[0.3em] uppercase">
                        Decrypting Vault…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0e1a]">
            {/* Subtle ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/3 rounded-full blur-[200px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-500/3 rounded-full blur-[160px]" />
                {/* Subtle grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            <PriceAlertNotification />
            <Sidebar />

            {/* Main content — offset for sidebar on desktop, header on mobile */}
            <main className="relative z-10 lg:pl-64 min-h-screen pt-16 lg:pt-0">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
